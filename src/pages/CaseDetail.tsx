import React from 'react';
import { useParams } from 'react-router-dom';

const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <h1>案例详情</h1>
      <p>当前案例 ID 是: {id}</p>
    </div>
  );
};

export default CaseDetail;
