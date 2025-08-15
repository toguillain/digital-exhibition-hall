import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getLastSceneForVisitor } from '../api/project';

const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [caseDetail, setCaseDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchDetails = async () => {
        try {
          setLoading(true);
          const response = await getLastSceneForVisitor(id);
          setCaseDetail(response.data);
          setError(null);
        } catch (err) {
          setError('Failed to fetch case details.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      fetchDetails();
    }
  }, [id]);

  if (loading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>错误: {error}</div>;
  }

  return (
    <div>
      <h1>案例详情</h1>
      <p>当前案例 ID 是: {id}</p>
      {caseDetail ? (
        <pre>{JSON.stringify(caseDetail, null, 2)}</pre>
      ) : (
        <p>没有找到案例详情。</p>
      )}
    </div>
  );
};

export default CaseDetail;
