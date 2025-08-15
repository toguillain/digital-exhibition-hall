const BASE_URL = 'http://192.168.6.216:8085';

export const getLastSceneForVisitor = async (tenantid: string) => {
  const response = await fetch(`${BASE_URL}/project/getLastSceneForVisitor?tenantid=${tenantid}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export const getProjectListForVisitor = async (page: number, pageSize: number) => {
  const response = await fetch(`${BASE_URL}/project/listForVisitor?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};
