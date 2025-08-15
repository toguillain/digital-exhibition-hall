declare module '@mkkellogg/gaussian-splats-3d' {
    import * as THREE from 'three';

    export enum LogLevel {
        None = 0,
        Error = 1,
        Warning = 2,
        Info = 3,
        Debug = 4,
    }

    export enum RenderMode {
        Always = 0,
        OnChange = 1,
        Never = 2,
    }

    export enum SceneFormat {
        Splat = 0,
        KSplat = 1,
        Ply = 2,
        Spz = 3,
    }

    export enum SceneRevealMode {
        Default = 0,
        Gradual = 1,
        Instant = 2,
    }

    export enum SplatRenderMode {
        ThreeD = 0,
        TwoD = 1,
    }

    export enum WebXRMode {
        None = 0,
        VR = 1,
        AR = 2,
    }

    export class AbortablePromise extends Promise<any> {
        constructor(executor: (resolve: (value?: any) => void, reject: (reason?: any) => void) => void, abortHandler?: (reason?: any) => void);
        abort(reason?: any): void;
    }

    export class OrbitControls extends THREE.EventDispatcher<{ start: {}; end: {}; change: {} }> {
        constructor(object: THREE.Camera, domElement?: HTMLElement);
        object: THREE.Camera;
        domElement: HTMLElement;
        enabled: boolean;
        target: THREE.Vector3;
        minDistance: number;
        maxDistance: number;
        minZoom: number;
        maxZoom: number;
        minPolarAngle: number;
        maxPolarAngle: number;
        minAzimuthAngle: number;
        maxAzimuthAngle: number;
        enableDamping: boolean;
        dampingFactor: number;
        enableZoom: boolean;
        zoomSpeed: number;
        enableRotate: boolean;
        rotateSpeed: number;
        enablePan: boolean;
        panSpeed: number;
        screenSpacePanning: boolean;
        keyPanSpeed: number;
        autoRotate: boolean;
        autoRotateSpeed: number;
        keys: { LEFT: string; UP: string; RIGHT: string; BOTTOM: string };
        mouseButtons: { LEFT: THREE.MOUSE; MIDDLE: THREE.MOUSE; RIGHT: THREE.MOUSE };
        touches: { ONE: THREE.TOUCH; TWO: THREE.TOUCH };
        target0: THREE.Vector3;
        position0: THREE.Vector3;
        zoom0: number;
        getPolarAngle(): number;
        getAzimuthalAngle(): number;
        getDistance(): number;
        listenToKeyEvents(domElement: HTMLElement): void;
        saveState(): void;
        reset(): void;
        update(): boolean;
        dispose(): void;
    }

    export class SplatBuffer {
        constructor(bufferData: ArrayBuffer, secLoadedCountsToMax?: boolean);
        getSplatCount(): number;
        getMaxSplatCount(): number;
        getMinSphericalHarmonicsDegree(): number;
        getSplatCenter(globalSplatIndex: number, outCenter: THREE.Vector3, transform?: THREE.Matrix4): void;
    }

    export class SplatScene extends THREE.Object3D {
        constructor(splatBuffer: SplatBuffer, position?: THREE.Vector3, quaternion?: THREE.Quaternion, scale?: THREE.Vector3, minimumAlpha?: number, opacity?: number, visible?: boolean);
        splatBuffer: SplatBuffer;
        transform: THREE.Matrix4;
        minimumAlpha: number;
        opacity: number;
        visible: boolean;
    }

    export class SceneHelper {
        constructor(threeScene: THREE.Scene);
        public threeScene: THREE.Scene;
        public splatRenderTarget: THREE.WebGLRenderTarget | null;
        public meshCursor: THREE.Object3D | null;
        public focusMarker: THREE.Mesh | null;
        public controlPlane: THREE.Object3D | null;
        public updateSplatRenderTargetForRenderDimensions(width: number, height: number): void;
        public setMeshCursorVisibility(visible: boolean): void;
        public setMeshCursorPosition(position: THREE.Vector3): void;
        public positionAndOrientMeshCursor(position: THREE.Vector3, camera: THREE.Camera): void;
    }

    export interface ViewerOptions {
        cameraUp?: number[];
        initialCameraPosition?: number[];
        initialCameraLookAt?: number[];
        dropInMode?: boolean;
        selfDrivenMode?: boolean;
        useBuiltInControls?: boolean;
        rootElement?: HTMLElement;
        ignoreDevicePixelRatio?: boolean;
        halfPrecisionCovariancesOnGPU?: boolean;
        threeScene?: THREE.Scene;
        renderer?: THREE.WebGLRenderer;
        camera?: THREE.Camera;
        gpuAcceleratedSort?: boolean;
        integerBasedSort?: boolean;
        sharedMemoryForWorkers?: boolean;
        dynamicScene?: boolean;
        antialiased?: boolean;
        kernel2DSize?: number;
        webXRMode?: WebXRMode;
        webXRSessionInit?: any;
        renderMode?: RenderMode;
        sceneRevealMode?: SceneRevealMode;
        focalAdjustment?: number;
        maxScreenSpaceSplatSize?: number;
        logLevel?: LogLevel;
        sphericalHarmonicsDegree?: number;
        enableOptionalEffects?: boolean;
        enableSIMDInSort?: boolean;
        inMemoryCompressionLevel?: number;
        optimizeSplatData?: boolean;
        freeIntermediateSplatData?: boolean;
        splatRenderMode?: SplatRenderMode;
        sceneFadeInRateMultiplier?: number;
        splatSortDistanceMapPrecision?: number;
    }

    export interface AddSplatSceneOptions {
        path?: string;
        splatAlphaRemovalThreshold?: number;
        showLoadingUI?: boolean;
        position?: number[];
        rotation?: number[];
        scale?: number[];
        onProgress?: (progress: number, total: number, status: any) => void;
        headers?: Record<string, string>;
        progressiveLoad?: boolean;
        format?: SceneFormat;
        [key: string]: any;
    }

    export class Viewer {
        constructor(options?: ViewerOptions);

        public splatMesh: SplatMesh | null;
        public camera: THREE.Camera;
        public controls: OrbitControls;
        public raycaster: Raycaster;
        public threeScene: THREE.Scene;
        public renderer: THREE.WebGLRenderer;
        public sceneHelper: SceneHelper;

        public init(): void;
        public addSplatScene(path: string, options?: AddSplatSceneOptions): AbortablePromise;
        public addSplatScenes(sceneOptions: AddSplatSceneOptions[], showLoadingUI?: boolean, onProgress?: Function): AbortablePromise;
        public removeSplatScene(indexToRemove: number, showLoadingUI?: boolean): Promise<void>;
        public removeSplatScenes(indexesToRemove: number[], showLoadingUI?: boolean): Promise<void>;
        public start(): void;
        public stop(): void;
        public dispose(): Promise<void>;
        public getSplatScene(sceneIndex: number): SplatScene;
        public getSceneCount(): number;
        public update(renderer?: THREE.WebGLRenderer, camera?: THREE.Camera): void;
        public render(renderer?: THREE.WebGLRenderer, camera?: THREE.Camera): void;
    }

    export class SplatMesh extends THREE.Mesh {
         constructor(splatRenderMode?: SplatRenderMode, dynamicMode?: boolean, enableOptionalEffects?: boolean,
                halfPrecisionCovariancesOnGPU?: boolean, devicePixelRatio?: number, enableDistancesComputationOnGPU?: boolean,
                integerBasedDistancesComputation?: boolean, antialiased?: boolean, maxScreenSpaceSplatSize?: number, logLevel?: LogLevel,
                sphericalHarmonicsDegree?: number, sceneFadeInRateMultiplier?: number, kernel2DSize?: number);
        public getSplatCount(includeSinceLastBuild?: boolean): number;
        public getSplatCenter(globalIndex: number, outCenter: THREE.Vector3, applySceneTransform?: boolean): void;
        public getSplatScaleAndRotation(globalIndex: number, outScale: THREE.Vector3, outRotation: THREE.Quaternion, applySceneTransform?: boolean): void;
        public getSplatColor(globalIndex: number, outColor: THREE.Vector4): void;
    }

    export class Raycaster {
        constructor(origin?: THREE.Vector3, direction?: THREE.Vector3, raycastAgainstTrueSplatEllipsoid?: boolean);
        public setFromCameraAndScreenPosition(camera: THREE.Camera, screenPosition: THREE.Vector2, screenDimensions: { x: number, y: number }): void;
        public intersectSplatMesh(splatMesh: SplatMesh, outHits: Hit[]): Hit[];
    }

    export class Hit {
        public splatIndex: number;
        public origin: THREE.Vector3;
        public normal: THREE.Vector3;
        public distance: number;
    }

    export class DropInViewer extends THREE.Group {
        constructor(options?: ViewerOptions);
        addSplatScene(path: string, options?: AddSplatSceneOptions): AbortablePromise;
        addSplatScenes(sceneOptions: AddSplatSceneOptions[], showLoadingUI?: boolean): AbortablePromise;
        getSplatScene(sceneIndex: number): SplatScene;
        removeSplatScene(index: number, showLoadingUI?: boolean): Promise<void>;
        removeSplatScenes(indexes: number[], showLoadingUI?: boolean): Promise<void>;
        getSceneCount(): number;
        setActiveSphericalHarmonicsDegrees(activeSphericalHarmonicsDegrees: number): void;
        dispose(): Promise<void>;
    }

    // Loaders and parsers
    export class KSplatLoader {
        static loadFromURL(fileName: string, onProgress?: Function, progressiveLoad?: boolean, onSectionBuilt?: Function, headers?: object): AbortablePromise;
    }
    export class PlyLoader {
        static loadFromURL(fileName: string, onProgress?: Function, progressiveLoad?: boolean, onSectionBuilt?: Function, minimumAlpha?: number, compressionLevel?: number, optimizeSplatData?: boolean, outSphericalHarmonicsDegree?: number, headers?: object): AbortablePromise;
    }
    export class SplatLoader {
        static loadFromURL(fileName: string, onProgress?: Function, progressiveLoad?: boolean, onSectionBuilt?: Function, minimumAlpha?: number, compressionLevel?: number, optimizeSplatData?: boolean, headers?: object): AbortablePromise;
    }
    export class SpzLoader {
        static loadFromURL(fileName: string, onProgress?: Function, minimumAlpha?: number, compressionLevel?: number, optimizeSplatData?: boolean, outSphericalHarmonicsDegree?: number, headers?: object): AbortablePromise;
    }
    export class PlyParser {
        static parseToUncompressedSplatArray(plyBuffer: ArrayBuffer, outSphericalHarmonicsDegree?: number): any;
    }
    export class PlayCanvasCompressedPlyParser {
        static parseToUncompressedSplatArray(plyBuffer: ArrayBuffer, outSphericalHarmonicsDegree?: number): any;
    }
    export class SplatParser {
        static parseStandardSplatToUncompressedSplatArray(inBuffer: ArrayBuffer): any;
    }
    
    // Other exports
    export const LoaderUtils: any;
    export class SplatBufferGenerator {}
    export class SplatPartitioner {}
}
