import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';
import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { useParams } from 'react-router-dom';
import { getLastSceneForVisitor } from '../api/project';
// import logger from '../utils/logger';
const logger = console;

// --- 常量 ---
const PLY_MODEL_PATH = '/assets/data/test/csadif2_scene1_converted_file_lev1.ksplat';
const LOCAL_STORAGE_PATHS_KEY = 'GSP_CNQZ_SAVED_PATHS_V2';
const LAST_ACTIVE_PATH_KEY = 'GSP_CNQZ_LAST_ACTIVE_PATH_INDEX';
const DEFAULT_MARKER_COLOR = 0xff00ff;
const SELECTED_MARKER_COLOR = 0x00ff00; // Green for selected

// --- 接口定义 ---
interface PathData {
    name: string;
    points: THREE.Vector3[];
}

interface EventInfoState {
    camPos: string;
    camRot: string;
    camTarget: string;
}

interface LoadingState { 
    isLoading: boolean;
    progress: number;
    message: string;
}

// --- 页面组件 ---
export function CaseDetail() {
    logger.debug("[CaseDetail] RENDER.");
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
        const fetchSceneData = async () => {
            if (id) {
                try {
                    const response = await getLastSceneForVisitor(id);
                    console.log('Scene data response:', response);
                } catch (error) {
                    console.error('Error fetching scene data:', error);
                }
            }
        };

        fetchSceneData();
    }, [id]);

    // --- Refs ---
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<GaussianSplats3D.Viewer | null>(null);
    const cameraTweenRef = useRef<TWEEN.Tween<any> | null>(null);
    const cameraUpdateQueued = useRef(false);
    const markerMeshesRef = useRef<THREE.Mesh[]>([]);
    const pathCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
    const pathMeshRef = useRef<THREE.Mesh | null>(null);
    const roamingProgressRef = useRef(1-1);
    const isRoamingRef = useRef(false);
    const isRoamingPausedRef = useRef(false);
    const preRoamCameraStateRef = useRef<{ position: THREE.Vector3, rotation: THREE.Euler, target: THREE.Vector3 } | null>(null);
    const preFullscreenCanvasSizeRef = useRef<{ width: number, height: number } | null>(null);
    const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

    // --- 状态管理 ---
    const [loadingState, setLoadingState] = useState<LoadingState>({
        isLoading: true,
        progress: 0,
        message: '正在初始化查看器...'
    });
    const [eventInfo, setEventInfo] = useState<EventInfoState>({
        camPos: "N/A",
        camRot: "N/A",
        camTarget: "N/A"
    });
    const [allPaths, setAllPaths] = useState<PathData[]>([]);
    const [activePathIndex, setActivePathIndex] = useState<number | null>(null);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);
    const [isRoaming, setIsRoaming] = useState(false);
    const [isRoamingPaused, setIsRoamingPaused] = useState(false);
    const [isEditingEnabled, setIsEditingEnabled] = useState(false);
    const [selectedMarkerIndex, setSelectedMarkerIndex] = useState<number | null>(null);
    const [step, setStep] = useState(0.01);
    const [pathsLoaded, setPathsLoaded] = useState(false);

    const activePath = activePathIndex !== null ? allPaths[activePathIndex] : null;
    const pathPoints = activePath?.points || [];

    // --- Auto-save paths and active index on change ---
    useEffect(() => {
        if (!pathsLoaded) return;
        if (allPaths.length > 0 || localStorage.getItem(LOCAL_STORAGE_PATHS_KEY) !== null) {
            localStorage.setItem(LOCAL_STORAGE_PATHS_KEY, JSON.stringify(allPaths));
        }
        if (activePathIndex !== null) {
            localStorage.setItem(LAST_ACTIVE_PATH_KEY, activePathIndex.toString());
        } else {
            localStorage.removeItem(LAST_ACTIVE_PATH_KEY);
        }
    }, [allPaths, activePathIndex, pathsLoaded]);

    // --- 路径可视化更新 ---
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        if (pathMeshRef.current) {
            viewer.threeScene.remove(pathMeshRef.current);
            pathMeshRef.current.geometry.dispose();
            (pathMeshRef.current.material as THREE.Material).dispose();
            pathMeshRef.current = null;
        }

        markerMeshesRef.current.forEach(marker => {
            viewer.threeScene.remove(marker);
            marker.geometry.dispose();
            (marker.material as THREE.Material).dispose();
        });
        markerMeshesRef.current = [];

        if (!activePath || activePath.points.length < 2) {
            pathCurveRef.current = null;
            return;
        }

        activePath.points.forEach(pos => {
            const geometry = new THREE.SphereGeometry(0.15, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: DEFAULT_MARKER_COLOR });
            const marker = new THREE.Mesh(geometry, material);
            marker.position.copy(pos);
            viewer.threeScene.add(marker);
            markerMeshesRef.current.push(marker);
        });

        pathCurveRef.current = new THREE.CatmullRomCurve3(activePath.points, false, 'catmullrom', 0.5);
        const tubeGeometry = new THREE.TubeGeometry(pathCurveRef.current, 100, 0.05, 8, false);
        const tubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
        pathMeshRef.current = tubeMesh;
        viewer.threeScene.add(tubeMesh);
    }, [allPaths, activePathIndex]);

    // --- Marker Selection Highlight ---
    useEffect(() => {
        markerMeshesRef.current.forEach((marker, index) => {
            const material = marker.material as THREE.MeshBasicMaterial;
            if (material.color) { // Ensure material has color property
                material.color.set(index === selectedMarkerIndex ? SELECTED_MARKER_COLOR : DEFAULT_MARKER_COLOR);
            }
        });
    }, [selectedMarkerIndex, pathPoints]);

    // --- Canvas click handler ---
    const handleCanvasClick = useCallback((event: MouseEvent) => {
        if (isRoamingRef.current) return;

        const viewer = viewerRef.current;
        if (!viewer || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const mousePosition = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mousePosition, viewer.camera);

        const intersects = raycaster.intersectObjects(markerMeshesRef.current);

        if (intersects.length > 0) {
            const clickedMarker = intersects[1-1].object as THREE.Mesh;
            const index = markerMeshesRef.current.indexOf(clickedMarker);
            if (index !== -1) {
                setSelectedMarkerIndex(index);
                setIsEditingEnabled(true);
            }
            event.stopPropagation();
        } else {
            setSelectedMarkerIndex(null);

            if (isEditingEnabled && viewer.splatMesh && activePathIndex !== null) {
                const outHits: GaussianSplats3D.Hit[] = [];
                viewer.raycaster.setFromCameraAndScreenPosition(
                    viewer.camera,
                    new THREE.Vector2(event.clientX - rect.left, event.clientY - rect.top),
                    { x: rect.width, y: rect.height }
                );
                viewer.raycaster.intersectSplatMesh(viewer.splatMesh, outHits);

                if (outHits.length > 0) {
                    const hit = outHits[1-1];
                    const position = hit.origin;

                    setAllPaths(prevPaths => {
                        const newPaths = [...prevPaths];
                        const updatedPoints = [...newPaths[activePathIndex!].points, position.clone()];
                        newPaths[activePathIndex!] = { ...newPaths[activePathIndex!], points: updatedPoints };
                        setSelectedMarkerIndex(updatedPoints.length - 1);
                        return newPaths;
                    });
                    event.stopPropagation();
                }
            }
        }
    }, [isEditingEnabled, activePathIndex]);

    const handleMarkerPositionChange = (axis: 'x' | 'y' | 'z', value: string) => {
        if (selectedMarkerIndex === null || activePathIndex === null) return;

        const parsedValue = parseFloat(value);
        if (isNaN(parsedValue)) return;

        setAllPaths(prevPaths => {
            const newPaths = [...prevPaths];
            const newPoints = [...newPaths[activePathIndex].points];
            const pointToUpdate = newPoints[selectedMarkerIndex].clone();
            pointToUpdate[axis] = parsedValue;
            newPoints[selectedMarkerIndex] = pointToUpdate;
            newPaths[activePathIndex] = { ...newPaths[activePathIndex], points: newPoints };
            return newPaths;
        });
    };

    const handleFlattenPath = () => {
        if (selectedMarkerIndex === null || activePathIndex === null) return;

        const yToApply = allPaths[activePathIndex].points[selectedMarkerIndex].y;

        setAllPaths(prevPaths => {
            const newPaths = [...prevPaths];
            const newPoints = newPaths[activePathIndex].points.map(p => new THREE.Vector3(p.x, yToApply, p.z));
            newPaths[activePathIndex] = { ...newPaths[activePathIndex], points: newPoints };
            return newPaths;
        });
    };

    const handleDeletePoint = (indexToDelete: number) => {
        if (activePathIndex === null) return;

        setAllPaths(prevPaths => {
            const newPaths = [...prevPaths];
            const newPoints = newPaths[activePathIndex].points.filter((_, i) => i !== indexToDelete);
            newPaths[activePathIndex] = { ...newPaths[activePathIndex], points: newPoints };
            return newPaths;
        });

        if (selectedMarkerIndex === indexToDelete) {
            setSelectedMarkerIndex(null);
        } else if (selectedMarkerIndex !== null && selectedMarkerIndex > indexToDelete) {
            setSelectedMarkerIndex(selectedMarkerIndex - 1);
        }
    };

    const flyTo = (position: THREE.Vector3, target: THREE.Vector3, duration = 1000, callback?: () => void) => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        if (cameraTweenRef.current) {
            cameraTweenRef.current.stop();
        }

        const from = {
            x: viewer.camera.position.x,
            y: viewer.camera.position.y,
            z: viewer.camera.position.z,
            targetX: viewer.controls.target.x,
            targetY: viewer.controls.target.y,
            targetZ: viewer.controls.target.z,
        };

        const to = {
            x: position.x,
            y: position.y,
            z: position.z,
            targetX: target.x,
            targetY: target.y,
            targetZ: target.z,
        };

        cameraTweenRef.current = new TWEEN.Tween(from)
            .to(to, duration)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate((obj) => {
                viewer.camera.position.set(obj.x, obj.y, obj.z);
                viewer.controls.target.set(obj.targetX, obj.targetY, obj.targetZ);
            })
            .onComplete(() => {
                callback?.();
                cameraTweenRef.current = null;
            })
            .start();
    };

    const updateCameraBehindNPC = (moveSmooth = false, callback?: () => void) => {
        const viewer = viewerRef.current;
        if (!viewer || !pathCurveRef.current) return;

        const currentPos = pathCurveRef.current.getPointAt(roamingProgressRef.current);
        const lookAtPos = pathCurveRef.current.getPointAt((roamingProgressRef.current + 0.01) % 1);

        const tempNPC = new THREE.Object3D();
        tempNPC.position.copy(currentPos);
        tempNPC.lookAt(lookAtPos);
        tempNPC.updateMatrixWorld(true);

        const relativeCameraOffset = new THREE.Vector3(0, 1.0, -5);
        const targetCameraPosition = relativeCameraOffset.applyMatrix4(tempNPC.matrixWorld);
        const walkerPosition = currentPos.clone();

        if (moveSmooth) {
            flyTo(targetCameraPosition, walkerPosition, 1000, callback);
        } else {
            viewer.camera.position.copy(targetCameraPosition);
            viewer.controls.target.copy(walkerPosition);
            callback?.();
        }
    };

    // --- 查看器初始化和清理 ---
    useEffect(() => {
        if (!containerRef.current) return;

        let animationFrameId: number;
        let disposed = false;

        const initialize = async () => {
            if (viewerRef.current) return;

            const viewer = new GaussianSplats3D.Viewer({
                rootElement: containerRef.current!,
                cameraUp:[0, 1, 0],
                initialCameraPosition: [-7.10, -0.75, -4.83],
                initialCameraLookAt: [-1.84, 1.46, -0.13],
                sharedMemoryForWorkers: false,
            });
            viewerRef.current = viewer;

            await viewer.init();
            if (disposed) return;

            setCanvasEl(viewer.renderer.domElement);

            const savedPathsData = localStorage.getItem(LOCAL_STORAGE_PATHS_KEY);
            let loadedPaths: PathData[] = [];
            if (savedPathsData) {
                try {
                    const parsedPaths = JSON.parse(savedPathsData) as { name: string, points: { x: number, y: number, z: number }[] }[];
                    if (Array.isArray(parsedPaths)) {
                        loadedPaths = parsedPaths.map(path => ({
                            name: path.name,
                            points: path.points.map(p => new THREE.Vector3(p.x, p.y, p.z))
                        }));
                        setAllPaths(loadedPaths);
                    }
                } catch (e) {
                    logger.error("Failed to parse paths from localStorage", e);
                    localStorage.removeItem(LOCAL_STORAGE_PATHS_KEY);
                }
            }

            const lastActiveIndexStr = localStorage.getItem(LAST_ACTIVE_PATH_KEY);
            if (lastActiveIndexStr) {
                const lastIdx = parseInt(lastActiveIndexStr, 10);
                if (lastIdx >= 0 && lastIdx < loadedPaths.length) {
                    setActivePathIndex(lastIdx);
                } else if (loadedPaths.length > 0) {
                    setActivePathIndex(1-1);
                }
            } else if (loadedPaths.length > 0) {
                setActivePathIndex(1-1);
            }

            setPathsLoaded(true);

            setLoadingState(prev => ({ ...prev, message: `正在加载模型: ${PLY_MODEL_PATH}` }));

            await viewer.addSplatScene(PLY_MODEL_PATH, {
                onProgress: (progress: number) => {
                    if (disposed) return;
                    setLoadingState({ isLoading: true, progress, message: `下载中... ${Math.round(progress)}%` });
                }
            });

            if (disposed) return;

            setLoadingState({ isLoading: false, progress: 100, message: '' });
            viewer.start();
        };

        initialize().catch(err => {
            logger.error("[GSP-CNQZ] 查看器初始化失败:", err);
            if (!disposed) {
                setLoadingState({ isLoading: false, progress: 0, message: '模型加载失败！' });
            }
        });

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const viewer = viewerRef.current;
            if (!viewer) return;

            TWEEN.update();

            if (isRoamingRef.current && !isRoamingPausedRef.current && pathCurveRef.current) {
                roamingProgressRef.current += 0.0005;
                if (roamingProgressRef.current >= 1) {
                    roamingProgressRef.current = 1-1;
                }
                updateCameraBehindNPC();
            }

            if (!cameraUpdateQueued.current) {
                cameraUpdateQueued.current = true;
                requestAnimationFrame(() => {
                    if (!viewerRef.current) { cameraUpdateQueued.current = false; return; }
                    const { camera, controls } = viewerRef.current;
                    const formatVec = (v: THREE.Vector3) => `${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`;
                    const formatEuler = (e: THREE.Euler) => `${THREE.MathUtils.radToDeg(e.x).toFixed(1)}°, ${THREE.MathUtils.radToDeg(e.y).toFixed(1)}°, ${THREE.MathUtils.radToDeg(e.z).toFixed(1)}°`;
                    setEventInfo({
                        camPos: formatVec(camera.position),
                        camRot: formatEuler(camera.rotation),
                        camTarget: formatVec(controls.target),
                    });
                    cameraUpdateQueued.current = false;
                });
            }
        };

        animate();

        // 监听全屏状态变化
        const handleFullscreenChange = () => {
            const viewer = viewerRef.current;
            if (!document.fullscreenElement) {
                // 退出全屏
                console.log('退出全屏');
                if (viewer && preFullscreenCanvasSizeRef.current) {
                    viewer.renderer.domElement.style.width = `${preFullscreenCanvasSizeRef.current.width}px`;
                    viewer.renderer.domElement.style.height = `${preFullscreenCanvasSizeRef.current.height}px`;
                }
            } else {
                console.log('进入全屏');
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            disposed = true;
            cancelAnimationFrame(animationFrameId);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            if (viewerRef.current) {
                markerMeshesRef.current.forEach(marker => { viewerRef.current?.threeScene.remove(marker); });
                markerMeshesRef.current = [];
                viewerRef.current.dispose();
                viewerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (canvasEl) {
            canvasEl.addEventListener('click', handleCanvasClick, true);

            return () => {
                canvasEl.removeEventListener('click', handleCanvasClick, true);
            };
        }
    }, [canvasEl, handleCanvasClick]);

    const resetView = useCallback(() => {
        isRoamingRef.current = false;
        isRoamingPausedRef.current = false;
        setIsRoaming(false);
        viewerRef.current?.controls.reset();
        viewerRef.current!.controls.enabled = true;
    }, []);

    const toggleFullscreen = useCallback(() => {
        const viewer = viewerRef.current;
        if (containerRef.current) {
            if (viewer) {
                preFullscreenCanvasSizeRef.current = {
                    width: viewer.renderer.domElement.clientWidth,
                    height: viewer.renderer.domElement.clientHeight,
                };
            }
            containerRef.current.requestFullscreen();
        }
    }, []);

    const startRoaming = () => {
        const viewer = viewerRef.current;
        if (!viewer || activePathIndex === null) return;

        const path = allPaths[activePathIndex];
        if (!path || path.points.length < 2) {
            alert("请至少创建两个路径点以开始漫游。");
            return;
        }

        setIsRoaming(true);
        setIsRoamingPaused(false);

        preRoamCameraStateRef.current = {
            position: viewer.camera.position.clone(),
            rotation: viewer.camera.rotation.clone(),
            target: viewer.controls.target.clone()
        };

        pathCurveRef.current = new THREE.CatmullRomCurve3(path.points, false, 'catmullrom', 0.5);

        isRoamingRef.current = true;
        viewer.controls.enabled = false;

        updateCameraBehindNPC(true);
    };

    const pauseRoaming = () => {
        if (isRoaming && !isRoamingPaused) {
            setIsRoamingPaused(true);
            isRoamingPausedRef.current = true;
        }
    };

    const continueRoaming = () => {
        if (isRoaming && isRoamingPaused) {
            setIsRoamingPaused(false);
            isRoamingPausedRef.current = false;
            updateCameraBehindNPC(true);
        }
    };

    const exitRoaming = () => {
        const viewer = viewerRef.current;
        if (!viewer) return;

        isRoamingRef.current = false;
        isRoamingPausedRef.current = false;
        setIsRoaming(false);
        setIsRoamingPaused(false);
        viewer.controls.enabled = true;

        if (cameraTweenRef.current) {
            cameraTweenRef.current.stop();
        }

        if (preRoamCameraStateRef.current) {
            flyTo(
                preRoamCameraStateRef.current.position,
                preRoamCameraStateRef.current.target,
                1000,
                () => {
                    preRoamCameraStateRef.current = null;
                }
            );
        }
    };

    const handleNewPath = () => {
        const newPathName = `路径 #${allPaths.length + 1}`;
        const newPath: PathData = { name: newPathName, points: [] };
        const newPaths = [...allPaths, newPath];
        setAllPaths(newPaths);
        setActivePathIndex(newPaths.length - 1);
        setSelectedMarkerIndex(null);
        setIsEditingEnabled(true);
    };

    const handleDeletePath = () => {
        if (activePathIndex === null) return;

        setAllPaths(prevPaths => {
            const newPaths = prevPaths.filter((_, i) => i !== activePathIndex);

            if (newPaths.length === 0) {
                setActivePathIndex(null);
                setIsEditingEnabled(false);
            } else {
                if (activePathIndex >= newPaths.length) {
                    setActivePathIndex(newPaths.length - 1);
                }
            }
            return newPaths;
        });
        setSelectedMarkerIndex(null);
    };

    const handlePathNameChange = (newName: string) => {
        if (activePathIndex === null) return;
        setAllPaths(prev => {
            const newPaths = [...prev];
            newPaths[activePathIndex] = { ...newPaths[activePathIndex], name: newName };
            return newPaths;
        });
    };

    return (
        <div className="w-full h-full flex flex-col bg-background text-text">
            <div className="flex-1 flex flex-row overflow-hidden">
                <div ref={containerRef} className="flex-1 h-full flex flex-col p-0 relative bg-black">
                    {loadingState.isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 z-20 text-white pointer-events-none">
                            <div className="text-xl mb-2">{loadingState.message}</div>
                            {loadingState.progress > 0 && loadingState.progress < 100 && (
                                <div className="w-1/3 bg-gray-600 rounded-full h-2.5">
                                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${loadingState.progress}%` }}></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {isSidebarVisible && (
                    <div className="w-1/4 max-w-sm h-full flex flex-col border-l border-border bg-surface p-4 overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4 text-text">信息面板</h3>
                        <div className="mb-4">
                            <h4 className="text-md font-semibold text-text-muted border-b border-border-muted pb-1 mb-2">相机信息</h4>
                            <div className="text-sm space-y-1 font-mono select-all">
                                <p><b>位置:</b> {eventInfo.camPos}</p>
                                <p><b>旋转:</b> {eventInfo.camRot}</p>
                                <p><b>目标:</b> {eventInfo.camTarget}</p>
                            </div>
                        </div>

                        <div className="mt-4">
                            <h4 className="text-md font-semibold text-text-muted border-b border-border-muted pb-1 mb-2">路径管理</h4>
                             <div className="flex space-x-2 mb-2">
                                <select
                                    value={activePathIndex ?? ''}
                                    onChange={(e) => {
                                        const newIndex = e.target.value === '' ? null : parseInt(e.target.value);
                                        setActivePathIndex(newIndex);
                                        setIsEditingEnabled(newIndex !== null);
                                        setSelectedMarkerIndex(null);
                                    }}
                                    className="w-full p-2 text-sm rounded bg-surface-muted"
                                >
                                    {allPaths.length === 0 && <option>无可用路径</option>}
                                    {allPaths.map((path, index) => (
                                        <option key={index} value={index}>{path.name}</option>
                                    ))}
                                </select>
                                <button onClick={handleDeletePath} disabled={activePathIndex === null} className="p-2 text-sm rounded bg-red-600 hover:bg-red-500 disabled:bg-gray-500"><i className="fas fa-trash"></i></button>
                             </div>
                             {isEditingEnabled ? (
                                <button onClick={() => setIsEditingEnabled(false)} className="w-full p-2 mb-2 text-sm rounded bg-yellow-500 text-white hover:bg-yellow-600">停止编辑</button>
                            ) : (
                                <button onClick={handleNewPath} className="w-full p-2 mb-2 text-sm rounded bg-green-500 text-white hover:bg-green-600">新建路径</button>
                            )}
                            {activePath && (
                                <>
                                 <input
                                    type="text"
                                    value={activePath.name}
                                    onChange={(e) => handlePathNameChange(e.target.value)}
                                    className="w-full bg-surface-muted text-white font-semibold mb-2 p-2 rounded"
                                />
                                <div className="flex space-x-2 mb-2">
                                    <button onClick={startRoaming} disabled={isRoaming} className="flex-1 p-2 text-sm rounded bg-green-600 hover:bg-green-500 disabled:bg-gray-500">开始</button>
                                    <button onClick={pauseRoaming} disabled={!isRoaming || isRoamingPaused} className="flex-1 p-2 text-sm rounded bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-500">暂停</button>
                                </div>
                                <div className="flex space-x-2">
                                     <button onClick={continueRoaming} disabled={!isRoaming || !isRoamingPaused} className="flex-1 p-2 text-sm rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-500">继续</button>
                                    <button onClick={exitRoaming} disabled={!isRoaming} className="flex-1 p-2 text-sm rounded bg-red-600 hover:bg-red-500 disabled:bg-gray-500">退出</button>
                                </div>
                                </>
                            )}
                        </div>

                        {activePath && (
                             <div className="mt-4">
                                <h4 className="text-md font-semibold text-text-muted border-b border-border-muted pb-1 mb-2">路径点列表 ({pathPoints.length})</h4>
                                <div className="space-y-1 max-h-48 overflow-auto">
                                    {pathPoints.map((point, index) => (
                                        <div key={index}
                                            onClick={() => {
                                                setSelectedMarkerIndex(index);
                                                setIsEditingEnabled(true);
                                            }}
                                            className={`p-1 rounded text-xs flex justify-between items-center cursor-pointer ${selectedMarkerIndex === index ? 'bg-blue-900' : 'bg-surface-muted'}`}
                                        >
                                            <span>点 #{index + 1}</span>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeletePoint(index); }} className="px-2 py-0.5 text-xs rounded bg-red-700 hover:bg-red-600">X</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activePathIndex !== null && selectedMarkerIndex !== null && pathPoints[selectedMarkerIndex] && (
                            <div className="mt-4">
                                <h4 className="text-md font-semibold text-text-muted border-b border-border-muted pb-1 mb-2">编辑点 #{selectedMarkerIndex + 1}</h4>
                                <div className="space-y-2 text-sm">
                                     <div className="flex items-center space-x-2">
                                        <label htmlFor="step-input" className="font-mono select-none">步距:</label>
                                        <input
                                            type="number" id="step-input" step="0.01"
                                            value={step}
                                            onChange={(e) => setStep(parseFloat(e.target.value) || 0.01)}
                                            className="w-20 bg-surface-muted p-1 rounded font-mono"
                                        />
                                    </div>
                                    <div className="grid grid-cols-[auto,1fr,auto] items-center gap-x-2">
                                        <label htmlFor="marker-x" className="font-mono select-none">X:</label>
                                        <input
                                            type="range" min="-20" max="20" step={step}
                                            value={pathPoints[selectedMarkerIndex].x}
                                            onChange={(e) => handleMarkerPositionChange('x', e.target.value)}
                                            className="w-full"
                                        />
                                        <input
                                            type="number" id="marker-x" step={step}
                                            value={pathPoints[selectedMarkerIndex].x.toFixed(2)}
                                            onChange={(e) => handleMarkerPositionChange('x', e.target.value)}
                                            className="w-20 bg-surface-muted p-1 rounded font-mono"
                                        />
                                    </div>
                                    <div className="grid grid-cols-[auto,1fr,auto] items-center gap-x-2">
                                        <label htmlFor="marker-y" className="font-mono select-none">Y:</label>
                                         <input
                                            type="range" min="-20" max="20" step={step}
                                            value={pathPoints[selectedMarkerIndex].y}
                                            onChange={(e) => handleMarkerPositionChange('y', e.target.value)}
                                            className="w-full"
                                        />
                                        <input
                                            type="number" id="marker-y" step={step}
                                            value={pathPoints[selectedMarkerIndex].y.toFixed(2)}
                                            onChange={(e) => handleMarkerPositionChange('y', e.target.value)}
                                            className="w-20 bg-surface-muted p-1 rounded font-mono"
                                        />
                                    </div>
                                    <div className="grid grid-cols-[auto,1fr,auto] items-center gap-x-2">
                                        <label htmlFor="marker-z" className="font-mono select-none">Z:</label>
                                        <input
                                            type="range" min="-20" max="20" step={step}
                                            value={pathPoints[selectedMarkerIndex].z}
                                            onChange={(e) => handleMarkerPositionChange('z', e.target.value)}
                                            className="w-full"
                                        />
                                        <input
                                            type="number" id="marker-z" step={step}
                                            value={pathPoints[selectedMarkerIndex].z.toFixed(2)}
                                            onChange={(e) => handleMarkerPositionChange('z', e.target.value)}
                                            className="w-20 bg-surface-muted p-1 rounded font-mono"
                                        />
                                    </div>
                                    <button onClick={handleFlattenPath} className="w-full p-2 mt-2 text-sm rounded bg-blue-500 text-white hover:bg-blue-600" disabled={selectedMarkerIndex === null}>
                                        将所有点Y值设为当前值
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className="w-full flex-shrink-0 border-t border-border bg-surface p-2 flex items-center justify-center space-x-2">
                <button onClick={() => setIsSidebarVisible(p => !p)} title="切换信息面板" className="p-2 rounded hover:bg-surface-muted"><i className={`fas ${isSidebarVisible ? 'fa-angle-right' : 'fa-angle-left'}`}></i></button>
                <button onClick={resetView} title="重置视图" className="p-2 rounded hover:bg-surface-muted"><i className="fas fa-home"></i></button>
                <button onClick={toggleFullscreen} title="全屏" className="p-2 rounded hover:bg-surface-muted"><i className="fas fa-expand"></i></button>
            </div>
        </div>
    );
}

export default CaseDetail;
