
import React, { useState } from 'react';
import { UserRole, User, School } from '../types';
import { db } from '../store';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PARENT);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }

    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    const users = db.getUsers();
    
    if (isRegistering) {
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }

      if (role === UserRole.ADMIN && !schoolName.trim()) {
        setError('请输入学校名称');
        return;
      }
      
      const existing = users.find(u => u.username === username);
      if (existing) {
        setError('用户名已存在');
        return;
      }

      let schoolId: string | undefined;
      if (role === UserRole.ADMIN) {
        const schools = db.getSchools();
        schoolId = 'sch_' + Math.random().toString(36).substr(2, 9);
        const newSchool: School = { id: schoolId, name: schoolName };
        db.saveSchools([...schools, newSchool]);
      }

      const newUser: User = {
        id: 'u_' + Math.random().toString(36).substr(2, 9),
        username,
        password, // Store plain text for demo, in production hash this
        role,
        schoolId,
        childIds: role === UserRole.PARENT ? [] : undefined
      };
      
      db.saveUsers([...users, newUser]);
      onLogin(newUser);
    } else {
      const user = users.find(u => u.username === username && u.password === password);
      if (!user) {
        setError('用户名或密码错误');
        return;
      }
      onLogin(user);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 text-white rounded-[2rem] shadow-2xl shadow-indigo-200 mb-6">
            <i className="fas fa-graduation-cap text-4xl"></i>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">EduAnalytics</h2>
          <p className="mt-2 text-slate-500 font-medium">{isRegistering ? '创建一个新的智慧教育账号' : '开启您的智能学情之旅'}</p>
        </div>

        <form className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 p-10" onSubmit={handleSubmit}>
          <div className="mb-8">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">
              {isRegistering ? '选择您的角色' : '您的登录身份'}
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { r: UserRole.PARENT, icon: 'fa-user-friends', label: '家长' },
                { r: UserRole.TEACHER, icon: 'fa-chalkboard-teacher', label: '教师' },
                { r: UserRole.ADMIN, icon: 'fa-user-shield', label: '管理员' }
              ].map(item => (
                <button
                  key={item.r}
                  type="button"
                  onClick={() => setRole(item.r)}
                  className={`py-4 px-2 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                    role === item.r 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-lg shadow-indigo-100' 
                      : 'border-slate-50 text-slate-400 hover:border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <i className={`fas ${item.icon} text-xl`}></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">用户名</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                  <i className="fas fa-user"></i>
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700"
                  placeholder="请输入您的用户名"
                />
              </div>
            </div>

            {isRegistering && role === UserRole.ADMIN && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">学校名称</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                    <i className="fas fa-school"></i>
                  </span>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700"
                    placeholder="如：晨曦实验中学"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">账号密码</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                  <i className="fas fa-lock"></i>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700"
                  placeholder="请输入您的密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            {isRegistering && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">确认密码</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                    <i className="fas fa-check-double"></i>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700"
                    placeholder="请再次输入密码"
                  />
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-xs font-black bg-red-50 px-4 py-3 rounded-xl border border-red-100">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all transform active:scale-[0.98]"
            >
              {isRegistering ? '立即创建账号' : '安全登录'}
            </button>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-50 text-center">
            <button 
              type="button"
              onClick={() => { setIsRegistering(!isRegistering); setError(''); setPassword(''); setConfirmPassword(''); }}
              className="group text-indigo-600 text-sm font-black transition-all hover:text-indigo-800"
            >
              {isRegistering ? (
                <>已有账号？<span className="underline decoration-2 underline-offset-4">立即返回登录</span></>
              ) : (
                <>还没有账号？<span className="underline decoration-2 underline-offset-4">申请注册入驻</span></>
              )}
              <i className="fas fa-chevron-right text-[10px] ml-2 group-hover:translate-x-1 transition-transform"></i>
            </button>
          </div>
        </form>

        <p className="text-center mt-12 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
          &copy; 2024 EduAnalytics Platform · All Rights Reserved
        </p>
      </div>
    </div>
  );
};

export default Login;
