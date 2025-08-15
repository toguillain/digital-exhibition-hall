import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import { getProjectListForVisitor } from './api/project';

interface CaseStudy {
  id: string;
  image: string;
  title: string;
}

const App: React.FC = () => {
  const navigate = useNavigate();
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // I'm assuming the response object will have a `total` property for the total number of items.
        const response = await getProjectListForVisitor(currentPage, pageSize);
        if (response.data) {
          const formattedData = response.data.map((item: any) => ({
            id: item.id,
            image: item.userMap?.shareLinkCoverThumb || `https://placehold.co/400x250/EFEFEF/333?text=${item.name}`,
            title: item.name,
          }));
          setCaseStudies(formattedData);
          if (response.total) {
            setTotalItems(response.total);
            setTotalPages(Math.ceil(response.total / pageSize));
          }
        }
        console.log('API Response:', response);
      } catch (error) {
        console.error('Error fetching scene data:', error);
        // Fallback to mock data if API fails
        console.log('API failed, loading mock data.');
        const mockData = Array.from({ length: pageSize }, (_, i) => ({
          id: `mock-${(currentPage - 1) * pageSize + i + 1}`,
          image: `https://placehold.co/400x250/EFEFEF/333?text=案例+${(currentPage - 1) * pageSize + i + 1}`,
          title: `客户案例 ${(currentPage - 1) * pageSize + i + 1}`,
        }));
        const mockTotal = 50;
        setCaseStudies(mockData);
        setTotalItems(mockTotal);
        setTotalPages(Math.ceil(mockTotal / pageSize));
      }
    };

    fetchData();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="page-container">
      <header className="header">
        <div className="header-content">
          <div className="logo">数字展厅</div>
          <nav className="nav-links">
            <a href="#">首页</a>
            <a href="#">硬件产品</a>
            <a href="#">软件产品</a>
            <a href="#">行业应用</a>
            <a href="#" className="active">客户案例</a>
            <a href="#">产品支持</a>
            <a href="#">关于我们</a>
            <a href="#" className="highlight-link">金砖大赛 <span className="badge">报名进行中</span></a>
          </nav>
          <div className="header-right">
            <div className="contact-info">
              <span className="phone-icon">📞</span>
              <span>400-080-9959</span>
            </div>
            <div className="search-and-3d">
              <span className="search-icon">🔍</span>
              <button className="btn-3d">3D官网</button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <h1>客户案例</h1>
            <p>利用3D数字化 实现更多目标</p>
            <p>了解同行是如何通过我们的解决方案为自身业务赋能</p>
            <button className="cta-button">咨询合作 🔄</button>
          </div>
        </section>

        <section className="cases-section">
          <div className="cases-container">
            <div className="filters">
              <div className="filter-group">
                <span className="filter-label">类型:</span>
                <button>全部</button>
                <button className="active">智慧文博</button>
                <button>虚拟仿真</button>
                <button>3D数字化场景展销</button>
                <button>3D数字化产品营销</button>
                <button>C2F+C2M 3D产品定制</button>
                <button>智慧教育</button>
              </div>
              <div className="filter-group">
                <span className="filter-label">行业:</span>
                <button>全部</button>
                <button className="active">博物馆</button>
                <button>教育/科研</button>
                <button>陶瓷艺术</button>
                <button>文化传媒</button>
                <button>文旅/景区</button>
              </div>
            </div>

            <div className="cases-grid">
              {caseStudies.map((study) => (
                <div key={study.id} className="case-card" onClick={() => navigate(`/case/${study.id}`)}>
                  <img src={study.image} alt={study.title} />
                  <p>{study.title}</p>
                </div>
              ))}
            </div>

            <div className="pagination">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>{'<'}</button>
              <span className="current-page">{currentPage}</span>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>{'>'}</button>
            
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-content">
            <div className="footer-left">
                <div className="footer-logo">数字展厅</div>
                <div className="footer-contact">
                    <p>服务热线</p>
                    <p className="footer-phone">400-080-9959</p>
                    <p>商务合作</p>
                    <p>Marketing@shuzizhanting.com</p>
                </div>
                <div className="social-icons">
                  <span className="social-icon">wx</span>
                  <span className="social-icon">wb</span>
                  <span className="social-icon">dou</span>
                </div>
            </div>
            <div className="footer-links">
                <div>
                    <h4>硬件设备</h4>
                    <a href="#">手持式三维扫描系统</a>
                    <a href="#">真彩色三维扫描系统</a>
                    <a href="#">工业级三维扫描系统</a>
                    <a href="#">空间三维激光扫描系统</a>
                    <a href="#">360°拍摄系统</a>
                    <a href="#">平铺拍摄系统</a>
                </div>
                <div>
                    <h4>软件产品</h4>
                    <a href="#">视创云展</a>
                    <a href="#">51建模网</a>
                    <a href="#">数字孪生</a>
                    <a href="#">3D引擎</a>
                </div>
                <div>
                    <h4>解决方案</h4>
                    <a href="#">虚拟仿真</a>
                    <a href="#">智慧文博</a>
                    <a href="#">3D产品营销</a>
                    <a href="#">3D场景展销</a>
                    <a href="#">3D产品定制</a>
                    <a href="#">智慧教育</a>
                </div>
                <div>
                    <h4>服务支持</h4>
                    <a href="#">售后服务</a>
                    <a href="#">手册下载</a>
                    <a href="#">软件下载</a>
                </div>
                <div>
                    <h4>关于我们</h4>
                    <a href="#">公司概况</a>
                    <a href="#">招贤纳士</a>
                    <a href="#">联系我们</a>
                </div>
            </div>
        </div>
        <div className="friendship-links">
          友情链接： <a href="#">51建模网</a> <a href="#">视创云展</a>
        </div>
        <div className="footer-bottom">
            <div className="certs">
              <span>国家高新技术企业</span>
              <span>ISO 9001认证</span>
              <span>ISO 2000-1认证</span>
              <span>ISO 27001认证</span>
              <span>知识产权管理体系认证</span>
              <span>中国博物馆协会会员</span>
              <span>国军标GJB9001-2017</span>
              <span>增值电信业务经营许可证：合字B2-20220111</span>
            </div>
            <p>Copyright © 2023 深圳数字展厅科技技术有限公司 版权所有 粤ICP备2021054921号 粤公网安备 44030502003271号</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
