import React, { useState } from 'react';
import { UserRole, User, School } from '../types.ts';
import { db } from '../store.ts';

interface LoginProps {
  onLogin: (user: User) => void;
  initialInviteCode?: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PARENT);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          setError('密码不匹配');
          return;
        }
        
        const users = await db.getUsers();
        if (users.find(u => u.username === username)) {
          setError('用户名已存在');
          return;
        }

        let schoolId: string | undefined;
        if (role === UserRole.ADMIN) {
          if (!schoolName.trim()) {
            setError('请输入学校名称');
            return;
          }
          const schools = await db.getSchools();
          schoolId = 'sch_' + Date.now();
          await db.saveSchools([...schools, { id: schoolId, name: schoolName }]);
        }

        const newUser: User = { 
          id: 'u_' + Date.now(), 
          username, 
          password, 
          role, 
          schoolId,
          childIds: role === UserRole.PARENT ? [] : undefined 
        };
        await db.saveUsers([...users, newUser]);
        onLogin(newUser);
      } else {
        const user = await db.login(username, password);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 text-white rounded-[2rem] shadow-2xl mb-6">
            <i className="fas fa-graduation-cap text-4xl"></i>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">EduAnalytics</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">智能学情管理平台</p>
        </div>

        <form className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 p-10 space-y-6" onSubmit={handleSubmit}>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
            {[{ r: UserRole.PARENT, label: '家长' }, { r: UserRole.TEACHER, label: '教师' }, { r: UserRole.ADMIN, label: '管理' }].map(item => (
              <button key={item.r} type="button" onClick={() => setRole(item.r)} className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${role === item.r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{item.label}</button>
            ))}
          </div>

          <div className="space-y-4">
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="用户名" />
            {isRegistering && role === UserRole.ADMIN && <input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="学校名称" />}
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="密码" />
            {isRegistering && <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl font-bold" placeholder="确认密码" />}
          </div>

          {error && <p className="text-red-500 text-xs font-black text-center">{error}</p>}

          <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-indigo-700 transition-colors">
            {isRegistering ? '立即注册' : '登 录'}
          </button>

          <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="w-full text-indigo-600 text-sm font-black text-center">
            {isRegistering ? '返回登录' : '没有账号？申请注册'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;