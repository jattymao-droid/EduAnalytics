
import React, { useState, useEffect } from 'react';
import { db } from './store';
import { User, UserRole, School } from './types';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import ParentDashboard from './pages/ParentDashboard';
import AdminDashboard from './pages/AdminDashboard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    db.init();
    
    // Check for invite code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('invite');
    if (code) {
      setInviteCode(code);
    }

    const currentUser = db.getCurrentUser();
    setUser(currentUser);
    if (currentUser?.schoolId) {
      const schools = db.getSchools();
      setSchool(schools.find(s => s.id === currentUser.schoolId) || null);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData: User) => {
    db.setCurrentUser(userData);
    setUser(userData);
    if (userData.schoolId) {
      const schools = db.getSchools();
      setSchool(schools.find(s => s.id === userData.schoolId) || null);
    } else {
      setSchool(null);
    }
  };

  const handleLogout = () => {
    db.setCurrentUser(null);
    setUser(null);
    setSchool(null);
    setInviteCode(null);
  };

  const handleUserUpdate = (updatedUser: User) => {
    db.setCurrentUser(updatedUser);
    setUser(updatedUser);
  };

  const handleSchoolUpdate = (updatedSchool: School) => {
    setSchool(updatedSchool);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} initialInviteCode={inviteCode} />;
  }

  const renderDashboard = () => {
    switch (user.role) {
      case UserRole.ADMIN: return <AdminDashboard user={user} onSchoolUpdate={handleSchoolUpdate} />;
      case UserRole.TEACHER: return <TeacherDashboard user={user} />;
      case UserRole.PARENT: return <ParentDashboard user={user} onUserUpdate={handleUserUpdate} initialInviteCode={inviteCode} />;
      default: return null;
    }
  };

  const getRoleLabel = () => {
    if (user.role === UserRole.ADMIN) return '学校管理员';
    if (user.role === UserRole.TEACHER) return '教师';
    return '家长';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm shadow-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {school?.logo ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md border border-slate-100">
                <img src={school.logo} alt="School Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="bg-gradient-to-tr from-indigo-600 to-blue-500 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-100">
                <i className="fas fa-graduation-cap text-xl"></i>
              </div>
            )}
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                {school?.name || 'EduAnalytics'}
              </h1>
              <p className="text-[10px] uppercase font-bold text-indigo-500 mt-1 tracking-widest">
                {school?.motto || 'Education Insights'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-none">{user.username}</p>
              <p className="text-[11px] font-bold text-slate-400 mt-1.5 uppercase tracking-wider">{getRoleLabel()}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="group bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all p-3 rounded-2xl border border-slate-100"
              title="退出登录"
            >
              <i className="fas fa-sign-out-alt group-hover:translate-x-0.5 transition-transform"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-10 sm:px-6 lg:px-8">
        {renderDashboard()}
      </main>
      
      <footer className="py-8 text-center text-slate-400 text-xs font-medium">
        &copy; 2024 EduAnalytics - 高级学情管理与分析平台
      </footer>
    </div>
  );
};

export default App;
