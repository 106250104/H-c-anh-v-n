import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  BookOpen, 
  PenTool, 
  User, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  Flame, 
  Award, 
  PlayCircle,
  Plus,
  Trash2,
  Save,
  Edit3,
  Video,
  ArrowLeft,
  Circle,
  RefreshCw,
  HelpCircle,
  Youtube,
  Link as LinkIcon,
  UploadCloud,
  FileText,
  Folder,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken, 
  signOut 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection } from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
let app, auth, db, appId;
try {
  if (typeof __firebase_config !== 'undefined') {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  }
} catch (e) {
  console.warn("Lỗi khởi tạo Firebase hoặc đang chạy local không có cấu hình môi trường:", e);
}


// --- HELPER: Xử lý Link Video ---
const getEmbedInfo = (url) => {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
  if (ytMatch) return { type: 'youtube', url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1` };
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return { type: 'drive', url: `https://drive.google.com/file/d/${driveMatch[1]}/preview` };
  return { type: 'video', url: url };
};

// --- INITIAL DATA ---
const DEFAULT_USER_DATA = {
  name: 'Học viên',
  level: 'Pre-IELTS 4.0',
  streak: 0,
  lastActiveDate: null,
};

const INITIAL_MODULES = [
  {
    id: 'm1',
    title: 'Từ vựng chủ đề',
    description: 'Nắm vững 3000 từ vựng cốt lõi cho kỳ thi IELTS.',
    color: 'bg-blue-500',
    icon: <BookOpen className="text-white w-6 h-6" />,
    linkedLessonId: 'vocab_env',
    type: 'practice'
  },
  {
    id: 'm2',
    title: 'Ngữ pháp',
    description: 'Hệ thống hóa toàn bộ điểm ngữ pháp quan trọng.',
    color: 'bg-purple-500',
    icon: <PenTool className="text-white w-6 h-6" />,
    linkedLessonId: 'grammar_tenses',
    type: 'practice'
  },
  {
    id: 'm4',
    title: 'Thư viện Video Bài giảng',
    description: 'Tổng hợp các video hướng dẫn và mẹo làm bài chi tiết.',
    color: 'bg-red-500',
    icon: <Video className="text-white w-6 h-6" />,
    linkedLessonId: 'video_lib',
    type: 'video'
  }
];

const INITIAL_LESSONS = {
  'vocab_env': {
    title: 'Từ vựng chủ đề',
    sets: [
      {
        id: 'set_1',
        title: 'Chủ đề: Environment (Môi trường)',
        questions: [
          {
            id: 1, type: 'multiple-choice',
            question: 'Từ nào sau đây có nghĩa là "Sự nóng lên toàn cầu"?',
            options: ['Climate change', 'Global warming', 'Greenhouse effect', 'Deforestation'],
            correctAnswer: 1, explanation: '"Global warming" là sự nóng lên toàn cầu.'
          },
          {
            id: 2, type: 'multiple-choice',
            question: 'Chọn từ đồng nghĩa với "Pollution" (Sự ô nhiễm):',
            options: ['Contamination', 'Purification', 'Conservation', 'Preservation'],
            correctAnswer: 0, explanation: '"Contamination" tương đồng với "Pollution".'
          }
        ]
      }
    ]
  },
  'grammar_tenses': {
    title: 'Ngữ pháp',
    sets: [
      {
        id: 'set_2',
        title: 'Thì Hiện tại đơn (Present Simple)',
        questions: [
          {
            id: 3, type: 'multiple-choice',
            question: 'He usually _______ to school by bus.',
            options: ['go', 'goes', 'going', 'went'],
            correctAnswer: 1, explanation: 'Chủ ngữ ngôi thứ 3 số ít động từ thêm s/es.'
          }
        ]
      }
    ]
  }
};

const INITIAL_VIDEOS = [
  { id: 1, title: 'Hướng dẫn tự học IELTS từ số 0', url: 'https://www.youtube.com/watch?v=sQuM5e0QGLg', progress: 0 },
];

// --- COMPONENTS ---
const ProgressBar = ({ progress, colorClass = "bg-blue-600", heightClass = "h-2" }) => (
  <div className={`w-full bg-gray-200 rounded-full ${heightClass} overflow-hidden`}>
    <div className={`${colorClass} ${heightClass} rounded-full transition-all duration-500`} style={{ width: `${progress}%` }}></div>
  </div>
);

const Sidebar = ({ activeTab, setActiveTab, userData, firebaseUser }) => {
  const navItems = [
    { id: 'home', label: 'Tổng quan', icon: <Home className="w-5 h-5" /> },
    { id: 'learn', label: 'Lộ trình học', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'profile', label: 'Cá nhân', icon: <User className="w-5 h-5" /> },
  ];

  const displayName = firebaseUser && !firebaseUser.isAnonymous && firebaseUser.displayName ? firebaseUser.displayName : (userData?.name || 'Học viên');
  const displayPhoto = firebaseUser && !firebaseUser.isAnonymous ? firebaseUser.photoURL : null;

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0 shadow-sm z-20">
      <div className="p-6">
        <h1 className="text-3xl font-black text-blue-600 tracking-tight flex items-center gap-2">
           <Flame className="w-8 h-8 text-orange-500"/> EngMaster
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id} onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all font-semibold ${
              activeTab === item.id ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {item.icon}<span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-6 border-t border-gray-100 bg-gray-50/50 cursor-pointer" onClick={() => setActiveTab('profile')}>
        <div className="flex items-center space-x-3">
          {displayPhoto ? (
             <img src={displayPhoto} alt="Avatar" className="w-10 h-10 rounded-full border border-blue-200 object-cover shadow-sm" />
          ) : (
             <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
               {displayName.charAt(0).toUpperCase()}
             </div>
          )}
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
            <p className="text-xs font-medium text-gray-500 truncate">{firebaseUser && !firebaseUser.isAnonymous ? 'Đã đồng bộ' : userData?.level || ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileNav = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home', label: 'Tổng quan', icon: <Home className="w-6 h-6" /> },
    { id: 'learn', label: 'Lộ trình', icon: <BookOpen className="w-6 h-6" /> },
    { id: 'profile', label: 'Cá nhân', icon: <User className="w-6 h-6" /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-50 pb-safe">
      {navItems.map((item) => (
        <button
          key={item.id} onClick={() => setActiveTab(item.id)}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`}
        >
          {item.icon}<span className="text-[10px] mt-1 font-bold">{item.label}</span>
        </button>
      ))}
    </div>
  );
};

// ==========================================
// 1. MODULE: CÂU HỎI TRẮC NGHIỆM (MODULE 1, 2)
// ==========================================
const ModuleDetailsList = ({ module, lessonData, userProgress, onBack, onStartPractice, setLessonsData }) => {
  const [expandedSets, setExpandedSets] = useState([]);
  const [addingSet, setAddingSet] = useState(false);
  const [newSetTitle, setNewSetTitle] = useState("");

  const [actionState, setActionState] = useState({ type: null, setId: null }); // types: 'add', 'import', 'delete'
  const [newQuestionForm, setNewQuestionForm] = useState({ id: Date.now(), type: 'multiple-choice', question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' });
  const [importText, setImportText] = useState("");
  const [selectedForDeletion, setSelectedForDeletion] = useState([]);

  if (!lessonData) return <div className="p-10 text-center">Chưa có dữ liệu</div>;

  const lessonProgress = userProgress[module.linkedLessonId] || {};
  const allSets = lessonData.sets || [];
  const totalQuestions = allSets.reduce((acc, set) => acc + set.questions.length, 0);

  const toggleSet = (setId) => {
    setExpandedSets(prev => prev.includes(setId) ? prev.filter(id => id !== setId) : [...prev, setId]);
    setActionState({ type: null, setId: null });
    setSelectedForDeletion([]);
  };

  const handleAddSet = () => {
    if(!newSetTitle.trim()) return alert('Vui lòng nhập tên bộ câu hỏi!');
    setLessonsData(prev => ({
      ...prev,
      [module.linkedLessonId]: {
         ...prev[module.linkedLessonId],
         sets: [...(prev[module.linkedLessonId].sets || []), { id: 'set_' + Date.now(), title: newSetTitle, questions: [] }]
      }
    }));
    setAddingSet(false); 
    setNewSetTitle('');
  };

  const handleDeleteSet = (setId) => {
    if(window.confirm('Xóa bộ câu hỏi này và toàn bộ câu hỏi bên trong? Hành động không thể hoàn tác.')) {
      setLessonsData(prev => ({
         ...prev,
         [module.linkedLessonId]: {
            ...prev[module.linkedLessonId],
            sets: prev[module.linkedLessonId].sets.filter(s => s.id !== setId)
         }
      }));
    }
  };

  const handleAction = (type, set) => {
    let subset = [];
    if (type === 'incorrect') subset = set.questions.filter(q => lessonProgress[q.id] === false);
    else if (type === 'unanswered') subset = set.questions.filter(q => lessonProgress[q.id] === undefined);
    else if (type === 'random') subset = [...set.questions].sort(() => 0.5 - Math.random());
    else subset = set.questions;

    if (subset.length === 0) return alert("Không có câu hỏi nào thỏa mãn điều kiện!");
    onStartPractice(module.linkedLessonId, { title: set.title, questions: subset });
  };

  const handleSaveNewQuestion = (setId) => {
    if (!newQuestionForm.question.trim() || newQuestionForm.options.some(opt => !opt.trim())) return alert("Điền đủ thông tin!");
    setLessonsData(prev => {
        const updatedSets = prev[module.linkedLessonId].sets.map(s => s.id === setId ? { ...s, questions: [...s.questions, { ...newQuestionForm, id: Date.now() }] } : s);
        return { ...prev, [module.linkedLessonId]: { ...prev[module.linkedLessonId], sets: updatedSets } };
    });
    setActionState({ type: null, setId: null }); 
    setNewQuestionForm({ id: Date.now(), type: 'multiple-choice', question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' });
  };

  const processImport = (setId) => {
    if (!importText.trim()) return alert("Vui lòng nhập nội dung!");
    const lines = importText.split('\n').filter(l => l.trim() !== '');
    const newQuestions = [];
    let failCount = 0;

    lines.forEach((line) => {
      const regex = /^\s*\d+[\.\)]?\s*(.*?)\s*(\*?a[\.\)])\s*(.*?)\s*(\*?b[\.\)])\s*(.*?)\s*(\*?c[\.\)])\s*(.*?)\s*(\*?d[\.\)])\s*(.*)$/i;
      const match = line.match(regex);
      if (match) {
        const qText = match[1].trim();
        const optionsData = [
          { label: match[2], text: match[3].trim() },
          { label: match[4], text: match[5].trim() },
          { label: match[6], text: match[7].trim() },
          { label: match[8], text: match[9].trim() }
        ];
        let correctIdx = 0;
        const options = optionsData.map((opt, index) => {
          if (opt.label.includes('*')) correctIdx = index;
          return opt.text;
        });
        newQuestions.push({ id: Date.now() + Math.random(), type: 'multiple-choice', question: qText, options: options, correctAnswer: correctIdx, explanation: '' });
      } else { failCount++; }
    });

    if (newQuestions.length > 0) {
      setLessonsData(prev => {
          const updatedSets = prev[module.linkedLessonId].sets.map(s => s.id === setId ? { ...s, questions: [...s.questions, ...newQuestions] } : s);
          return { ...prev, [module.linkedLessonId]: { ...prev[module.linkedLessonId], sets: updatedSets } };
      });
      setImportText(''); setActionState({ type: null, setId: null });
      alert(`✅ Đã thêm thành công ${newQuestions.length} câu hỏi!${failCount > 0 ? `\n❌ Bỏ qua ${failCount} dòng không đúng định dạng.` : ''}`);
    } else {
      alert("⚠️ Không tìm thấy câu hỏi đúng định dạng. Xem lại mẫu hướng dẫn nhé!");
    }
  };

  const confirmDelete = (setId) => {
    if (selectedForDeletion.length === 0) return;
    if (window.confirm(`Xóa ${selectedForDeletion.length} câu hỏi đã chọn?`)) {
      setLessonsData(prev => {
          const updatedSets = prev[module.linkedLessonId].sets.map(s => s.id === setId ? { ...s, questions: s.questions.filter(q => !selectedForDeletion.includes(q.id)) } : s);
          return { ...prev, [module.linkedLessonId]: { ...prev[module.linkedLessonId], sets: updatedSets } };
      });
      setActionState({ type: null, setId: null }); setSelectedForDeletion([]);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 mb-4 font-bold"><ArrowLeft className="w-5 h-5 mr-1" /> Quay lại Lộ trình</button>
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md ${module.color}`}>{module.icon}</div>
          <div>
             <h2 className="text-2xl font-black text-gray-900">{lessonData.title}</h2>
             <p className="text-gray-500 font-medium">{allSets.length} Bộ • {totalQuestions} Câu hỏi</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-3">
         <h3 className="font-bold text-gray-800 text-lg uppercase tracking-wider">Danh sách Bộ câu hỏi</h3>
         <button onClick={() => setAddingSet(true)} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-blue-100 transition-colors">
            <Plus size={18}/> Tạo Bộ mới
         </button>
      </div>

      {addingSet && (
         <div className="bg-white p-5 rounded-2xl border border-blue-200 flex flex-col md:flex-row gap-3 mb-6 shadow-sm">
            <input value={newSetTitle} onChange={e=>setNewSetTitle(e.target.value)} placeholder="Tên bộ câu hỏi (vd: Chủ đề Con người)..." className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 font-medium" />
            <div className="flex gap-2">
               <button onClick={() => {setAddingSet(false); setNewSetTitle('');}} className="px-5 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200">Hủy</button>
               <button onClick={handleAddSet} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md hover:bg-blue-700">Lưu</button>
            </div>
         </div>
      )}

      <div className="space-y-4">
         {allSets.length === 0 && <div className="text-center text-gray-500 py-10 bg-white rounded-3xl border border-gray-100">Chưa có bộ câu hỏi nào. Hãy tạo một bộ mới!</div>}
         
         {allSets.map(set => (
            <div key={set.id} className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden transition-all">
               {/* SET HEADER */}
               <div className="p-4 md:p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => toggleSet(set.id)}>
                   <div className="flex items-center gap-4">
                       <div className={`p-3 rounded-xl bg-blue-100 text-blue-600`}><Folder size={24}/></div>
                       <div>
                           <h4 className="font-bold text-gray-900 text-lg md:text-xl">{set.title}</h4>
                           <p className="text-sm font-bold text-gray-400 mt-0.5">{set.questions.length} câu hỏi trắc nghiệm</p>
                       </div>
                   </div>
                   <div className="flex items-center gap-2">
                       <button onClick={(e) => { e.stopPropagation(); handleDeleteSet(set.id); }} className="p-2 text-gray-300 hover:text-red-500 transition-colors rounded-lg"><Trash2 size={20}/></button>
                       <div className="p-2 bg-gray-100 rounded-xl text-gray-500 ml-1">
                          {expandedSets.includes(set.id) ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                       </div>
                   </div>
               </div>
               
               {/* SET BODY (EXPANDED) */}
               {expandedSets.includes(set.id) && (
                  <div className="border-t border-gray-100 bg-[#f8f9fa] p-4 md:p-6">
                     
                     {/* TOOLBAR NỘI BỘ */}
                     <div className="flex flex-wrap gap-2 mb-6 items-center">
                        <button onClick={() => handleAction('all', set)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition">Học toàn bộ</button>
                        <button onClick={() => handleAction('incorrect', set)} className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition">Làm câu sai</button>
                        <button onClick={() => handleAction('random', set)} className="px-3 py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-bold hover:bg-purple-100 transition">Ngẫu nhiên</button>
                        
                        <div className="w-px h-6 bg-gray-300 mx-1 hidden md:block"></div>
                        
                        <button onClick={() => setActionState({type:'add', setId: set.id})} className="px-3 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-green-100 transition"><Plus size={16}/> Thêm 1 câu</button>
                        <button onClick={() => setActionState({type:'import', setId: set.id})} className="px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-blue-100 transition"><UploadCloud size={16}/> Thêm nhanh</button>
                        
                        {actionState.type === 'delete' && actionState.setId === set.id ? (
                           <div className="flex gap-2">
                             <button onClick={() => { setActionState({type:null, setId:null}); setSelectedForDeletion([]); }} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold">Hủy xóa</button>
                             <button onClick={() => confirmDelete(set.id)} className="px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-sm">Xóa ({selectedForDeletion.length})</button>
                           </div>
                        ) : (
                           <button onClick={() => setActionState({type:'delete', setId: set.id})} disabled={set.questions.length === 0} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-gray-300 transition disabled:opacity-50"><Trash2 size={16}/> Chọn Xóa</button>
                        )}
                     </div>

                     {/* PANEL THÊM 1 CÂU */}
                     {actionState.type === 'add' && actionState.setId === set.id && (
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-200 mb-6">
                          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus size={18} className="text-blue-600"/> Thêm 1 câu hỏi vào bộ này</h3>
                          <textarea value={newQuestionForm.question} onChange={e => setNewQuestionForm({...newQuestionForm, question: e.target.value})} className="w-full p-4 mb-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium" rows="2" placeholder="Nhập câu hỏi..." />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            {newQuestionForm.options.map((opt, idx) => (
                              <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl border-2 ${newQuestionForm.correctAnswer === idx ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-white'}`}>
                                 <input type="radio" checked={newQuestionForm.correctAnswer === idx} onChange={() => setNewQuestionForm({...newQuestionForm, correctAnswer: idx})} className="w-5 h-5 text-green-600 cursor-pointer ml-2" />
                                 <input type="text" value={opt} onChange={e => { const newOpts = [...newQuestionForm.options]; newOpts[idx] = e.target.value; setNewQuestionForm({...newQuestionForm, options: newOpts}); }} className="w-full p-2 outline-none font-medium bg-transparent" placeholder={`Lựa chọn ${idx + 1}`} />
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-end gap-3 mt-2 border-t border-gray-100 pt-4">
                            <button onClick={() => setActionState({type:null, setId:null})} className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Hủy</button>
                            <button onClick={() => handleSaveNewQuestion(set.id)} className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md">Lưu vào bộ</button>
                          </div>
                        </div>
                     )}

                     {/* PANEL THÊM NHANH IMPORT */}
                     {actionState.type === 'import' && actionState.setId === set.id && (
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-blue-200 mb-6">
                          <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><UploadCloud size={18} className="text-blue-600"/> Nhập câu hỏi hàng loạt vào bộ này</h3>
                          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                            Mỗi câu hỏi phải nằm trên 1 dòng theo chuẩn: 
                            <code className="bg-gray-100 px-2 py-1 rounded text-red-500 mx-1 font-mono text-xs">1. Question? A. opt1 B. opt2 C. opt3 *D. opt4</code>
                          </p>
                          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} className="w-full p-4 mb-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-gray-50 font-medium whitespace-pre text-sm" rows="6" placeholder={`1. How are you? A. fine B. thanks C. thank *D. ok`}></textarea>
                          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-100 pt-4">
                            <div className="relative w-full md:w-auto">
                              <input type="file" accept=".txt" onChange={(e) => {
                                  const file = e.target.files[0];
                                  if(file && !file.name.endsWith('.txt')) return alert("Chỉ hỗ trợ file .txt");
                                  if(file) { const r = new FileReader(); r.onload=ev=>setImportText(ev.target.result); r.readAsText(file); }
                              }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                              <button className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-xl hover:bg-blue-100 transition-colors">
                                <FileText size={18} /> Mở file (.txt)
                              </button>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                               <button onClick={() => {setActionState({type:null, setId:null}); setImportText('');}} className="flex-1 md:flex-none px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Hủy</button>
                               <button onClick={() => processImport(set.id)} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md">Xử lý & Thêm</button>
                            </div>
                          </div>
                        </div>
                     )}

                     {/* DANH SÁCH CÂU HỎI TRONG BỘ */}
                     <div className="space-y-2">
                        {set.questions.length === 0 ? <p className="text-gray-400 font-medium text-center py-6 bg-white rounded-xl border border-dashed border-gray-200">Bộ câu hỏi này chưa có nội dung.</p> : set.questions.map((q, idx) => {
                           const status = lessonProgress[q.id];
                           const Icon = status === true ? CheckCircle : status === false ? XCircle : Circle;
                           const color = status === true ? "text-green-500" : status === false ? "text-red-500" : "text-gray-300";
                           const isDelete = actionState.type === 'delete' && actionState.setId === set.id;

                           return (
                             <div key={q.id} onClick={() => !isDelete && onStartPractice(module.linkedLessonId, { title: set.title, questions: [q] })} className={`p-4 bg-white rounded-xl border ${isDelete ? 'border-gray-200' : 'border-gray-100 cursor-pointer hover:border-blue-300 hover:shadow-sm'} flex items-start gap-3 transition-all`}>
                               {isDelete && <input type="checkbox" checked={selectedForDeletion.includes(q.id)} onChange={() => setSelectedForDeletion(prev => prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id])} className="w-5 h-5 mt-0.5 text-red-600 rounded cursor-pointer" />}
                               <div className="flex-1"><p className="font-semibold text-gray-800"><span className="text-gray-400 mr-2">{idx + 1}.</span>{q.question}</p></div>
                               <Icon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${color}`} />
                             </div>
                           );
                        })}
                     </div>

                  </div>
               )}
            </div>
         ))}
      </div>
    </div>
  );
};

const LessonEngine = ({ practiceConfig, setLessonsData, onQuestionAnswered, onComplete, onExit }) => {
  const { lessonId, quizData } = practiceConfig;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const currentQuestion = quizData.questions[currentIndex];
  const progress = (currentIndex / quizData.questions.length) * 100;

  const handleCheckAnswer = () => {
    if (selectedOption === null || editForm) return;
    setIsAnswered(true);
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    if (isCorrect) setScore(score + 1);
    onQuestionAnswered(lessonId, currentQuestion.id, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex < quizData.questions.length - 1) {
      setCurrentIndex(currentIndex + 1); setSelectedOption(null); setIsAnswered(false);
    } else setShowResult(true);
  };

  const handleSaveEdit = () => {
    setLessonsData(prev => {
      const fullLesson = prev[lessonId];
      if(!fullLesson || !fullLesson.sets) return prev;
      const updatedSets = fullLesson.sets.map(s => ({
          ...s, questions: s.questions.map(q => q.id === editForm.id ? editForm : q)
      }));
      quizData.questions = quizData.questions.map(q => q.id === editForm.id ? editForm : q);
      return { ...prev, [lessonId]: { ...fullLesson, sets: updatedSets } };
    });
    setEditForm(null); setIsAnswered(false); setSelectedOption(null);
  };

  const handleDeleteCurrentQuestion = () => {
    if(window.confirm("Xóa câu hỏi này?")) {
      setLessonsData(prev => {
        const fullLesson = prev[lessonId];
        if(!fullLesson || !fullLesson.sets) return prev;
        const updatedSets = fullLesson.sets.map(s => ({
            ...s, questions: s.questions.filter(q => q.id !== currentQuestion.id)
        }));
        quizData.questions = quizData.questions.filter(q => q.id !== currentQuestion.id);
        return { ...prev, [lessonId]: { ...fullLesson, sets: updatedSets } };
      });
      setIsAnswered(false); setSelectedOption(null);
    }
  };

  if (showResult) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 mt-10">
          <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"><Award className="w-12 h-12" /></div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">Hoàn thành bài tập!</h2>
          <p className="text-gray-500 font-medium mb-8">{quizData.title}</p>
          <div className="text-center mb-10"><p className="text-5xl font-black text-blue-600">{score}/{quizData.questions.length}</p><p className="text-sm text-gray-400 font-bold mt-2 uppercase">Số câu đúng</p></div>
          <button onClick={onComplete} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200">Hoàn tất</button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 md:px-0 flex flex-col h-[calc(100vh-80px)] md:h-screen">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onExit} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full"><XCircle className="w-7 h-7" /></button>
        <ProgressBar progress={progress} heightClass="h-3" />
        <span className="text-sm font-black text-gray-400">{currentIndex + 1} / {quizData.questions.length}</span>
      </div>

      <div className="flex-1 flex flex-col pb-24 overflow-y-auto">
        {editForm ? (
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-200">
            <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2"><Edit3 size={18}/> Sửa câu hỏi</h3>
            <textarea value={editForm.question} onChange={e => setEditForm({...editForm, question: e.target.value})} className="w-full p-4 mb-4 border border-gray-200 rounded-xl bg-gray-50 font-medium" rows="2" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {editForm.options.map((opt, idx) => (
                <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl border-2 ${editForm.correctAnswer === idx ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-white'}`}>
                   <input type="radio" checked={editForm.correctAnswer === idx} onChange={() => setEditForm({...editForm, correctAnswer: idx})} className="w-5 h-5 text-green-600 cursor-pointer ml-2" />
                   <input type="text" value={opt} onChange={e => { const newOpts = [...editForm.options]; newOpts[idx] = e.target.value; setEditForm({...editForm, options: newOpts}); }} className="w-full p-2 outline-none font-medium bg-transparent" />
                </div>
              ))}
            </div>
            <input type="text" value={editForm.explanation || ''} onChange={e => setEditForm({...editForm, explanation: e.target.value})} className="w-full p-4 mb-4 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium" placeholder="Giải thích đáp án (tùy chọn)" />
            <div className="flex justify-end gap-3"><button onClick={() => setEditForm(null)} className="px-5 py-2.5 font-bold text-gray-500">Hủy</button><button onClick={handleSaveEdit} className="px-5 py-2.5 font-bold text-white bg-blue-600 rounded-xl shadow-md">Lưu</button></div>
          </div>
        ) : (
          <div className="relative group">
            <div className="absolute -top-12 right-0 hidden group-hover:flex opacity-0 group-hover:opacity-100 gap-2 bg-white shadow-lg p-1.5 rounded-xl border border-gray-200 z-10">
               <button onClick={() => setEditForm({ ...currentQuestion, options: [...currentQuestion.options] })} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 size={16}/> Sửa</button>
               <button onClick={handleDeleteCurrentQuestion} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/> Xóa</button>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-800 mb-8 text-center leading-relaxed">{currentQuestion.question}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => {
                let btnClass = "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-400";
                if (isAnswered) {
                  if (index === currentQuestion.correctAnswer) btnClass = "bg-green-100 border-2 border-green-500 text-green-900";
                  else if (index === selectedOption) btnClass = "bg-red-100 border-2 border-red-500 text-red-900";
                  else btnClass = "bg-white border-2 border-gray-100 text-gray-300 opacity-50";
                } else if (selectedOption === index) btnClass = "bg-blue-50 border-2 border-blue-500 text-blue-800";
                return <button key={index} onClick={() => { if(!isAnswered) setSelectedOption(index); }} className={`p-5 rounded-2xl font-bold text-lg text-left transition-all ${btnClass}`}>{option}</button>;
              })}
            </div>
          </div>
        )}
      </div>

      <div className="fixed md:static bottom-0 left-0 right-0 p-4 md:p-0 bg-white md:bg-transparent border-t md:border-t-0 border-gray-200">
        {isAnswered && !editForm && (
          <div className={`p-4 md:mb-4 rounded-xl flex items-start gap-3 shadow-sm border-2 ${selectedOption === currentQuestion.correctAnswer ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            {selectedOption === currentQuestion.correctAnswer ? <CheckCircle className="w-6 h-6 mt-0.5" /> : <XCircle className="w-6 h-6 mt-0.5" />}
            <div><p className="font-black text-lg">{selectedOption === currentQuestion.correctAnswer ? 'Tuyệt vời!' : 'Chưa chính xác!'}</p><p className="font-medium mt-1">{currentQuestion.explanation}</p></div>
          </div>
        )}
        <div className="flex justify-end mt-4">
          {!editForm && (!isAnswered ? (
            <button onClick={handleCheckAnswer} disabled={selectedOption === null} className={`w-full md:w-auto px-10 py-4 rounded-2xl font-black text-lg transition-all ${selectedOption !== null ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:-translate-y-1' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Kiểm tra</button>
          ) : (
            <button onClick={handleNext} className={`w-full md:w-auto px-10 py-4 rounded-2xl font-black text-lg text-white shadow-lg transition-all hover:-translate-y-1 ${selectedOption === currentQuestion.correctAnswer ? 'bg-green-500 shadow-green-200' : 'bg-red-500 shadow-red-200'}`}>Tiếp tục</button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. MODULE: THƯ VIỆN VIDEO (MODULE 4)
// ==========================================

const VideoPlayer = ({ video, onBack, onTimeUpdate }) => {
  const mediaInfo = getEmbedInfo(video.url);
  const videoRef = useRef(null);

  useEffect(() => {
    if (mediaInfo.type === 'video' && videoRef.current && video.progress) {
      videoRef.current.currentTime = video.progress;
    }
  }, [video.progress, mediaInfo.type]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(video.id, videoRef.current.currentTime);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
       <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 font-bold"><ArrowLeft className="w-5 h-5 mr-1" /> Trở về Thư viện</button>
          <h2 className="text-xl font-black text-gray-900 truncate pl-4">{video.title}</h2>
       </div>
       
       <div className="w-full bg-black rounded-3xl overflow-hidden shadow-2xl aspect-video relative flex items-center justify-center border-4 border-gray-900">
          {mediaInfo.type === 'youtube' || mediaInfo.type === 'drive' ? (
             <iframe src={mediaInfo.url} className="w-full h-full absolute inset-0" allowFullScreen allow="autoplay"></iframe>
          ) : (
             <video ref={videoRef} src={mediaInfo.url} controls autoPlay className="w-full h-full object-contain" onTimeUpdate={handleTimeUpdate} playsInline />
          )}
       </div>
       
       <div className="bg-blue-50 text-blue-800 p-4 rounded-xl font-medium text-sm flex gap-3 items-start border border-blue-100">
          <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>Hệ thống tự động lưu vị trí xem đối với file MP4 trực tiếp. Với link YouTube/Drive, tiến độ xem được đồng bộ qua tài khoản Google của bạn trên trình duyệt.</p>
       </div>
    </div>
  );
};

const VideoLibrary = ({ videos, setVideos, onBack }) => {
  const [playingVideo, setPlayingVideo] = useState(null);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const handleAddVideo = () => {
    if (!newUrl.trim() || !newTitle.trim()) return alert('Nhập đủ tiêu đề và link!');
    const newVideo = { id: Date.now(), title: newTitle, url: newUrl, progress: 0 };
    setVideos([newVideo, ...videos]);
    setNewUrl(''); setNewTitle('');
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if(window.confirm('Xóa video này?')) setVideos(videos.filter(v => v.id !== id));
  };
  
  const startEdit = (video, e) => {
    e.stopPropagation();
    setEditingVideoId(video.id);
    setEditTitle(video.title);
    setEditUrl(video.url);
  };
  
  const saveEdit = (id, e) => {
    e.stopPropagation();
    if (!editUrl.trim() || !editTitle.trim()) return alert('Nhập đủ tiêu đề và link!');
    setVideos(videos.map(v => v.id === id ? { ...v, title: editTitle, url: editUrl } : v));
    setEditingVideoId(null);
  };
  
  const cancelEdit = (e) => {
    e.stopPropagation();
    setEditingVideoId(null);
  };

  const handleTimeUpdate = (id, time) => {
    setVideos(prev => prev.map(v => v.id === id ? { ...v, progress: time } : v));
  };
  
  const playVideo = (video) => {
      setPlayingVideo(video);
      if (!video.progress) {
          handleTimeUpdate(video.id, 1);
      }
  };

  if (playingVideo) return <VideoPlayer video={playingVideo} onBack={() => setPlayingVideo(null)} onTimeUpdate={handleTimeUpdate} />;

  return (
    <div className="space-y-8 pb-20">
      <div>
        <button onClick={onBack} className="flex items-center text-gray-500 hover:text-red-600 mb-4 font-bold"><ArrowLeft className="w-5 h-5 mr-1" /> Quay lại Lộ trình</button>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-md bg-red-500"><Video className="w-8 h-8"/></div>
          <div><h2 className="text-3xl font-black text-gray-900">Thư viện Video</h2><p className="text-gray-500 font-medium">{videos.length} bài giảng video</p></div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Plus className="text-red-500"/> Thêm Video mới</h3>
        <div className="flex flex-col md:flex-row gap-3">
          <input type="text" value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Tên bài giảng..." className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-red-400" />
          <input type="text" value={newUrl} onChange={e=>setNewUrl(e.target.value)} placeholder="Link YouTube, Drive hoặc MP4..." className="flex-[2] p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-red-400" />
          <button onClick={handleAddVideo} className="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors shadow-md">Thêm</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map(video => {
          const isYT = video.url.includes('youtu');
          const isDrive = video.url.includes('drive.google');
          return (
            <div key={video.id} onClick={() => playVideo(video)} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-red-200 transition group relative">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors">
                {isYT ? <Youtube className="w-8 h-8"/> : <PlayCircle className="w-8 h-8"/>}
              </div>
              
              {editingVideoId === video.id ? (
                <div className="flex-1 flex flex-col gap-2 pr-4" onClick={(e) => e.stopPropagation()}>
                   <input type="text" value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="p-2 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:border-red-400" placeholder="Tên bài giảng" />
                   <input type="text" value={editUrl} onChange={e=>setEditUrl(e.target.value)} className="p-2 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:border-red-400" placeholder="Link Video" />
                   <div className="flex gap-2 mt-1">
                      <button onClick={(e) => saveEdit(video.id, e)} className="px-4 py-1.5 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 text-sm">Lưu</button>
                      <button onClick={cancelEdit} className="px-4 py-1.5 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 text-sm">Hủy</button>
                   </div>
                </div>
              ) : (
                <div className="flex-1 overflow-hidden pr-20">
                  <h4 className="font-bold text-gray-900 text-lg truncate mb-1">{video.title}</h4>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                    <span className="bg-gray-100 px-2 py-1 rounded-md">{isYT ? 'YouTube' : isDrive ? 'Google Drive' : 'Video File'}</span>
                    {video.progress > 0 && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Đã xem</span>}
                  </div>
                </div>
              )}
              
              {editingVideoId !== video.id && (
                <div className="absolute right-4 flex items-center gap-1">
                   <button onClick={(e) => startEdit(video, e)} className="text-gray-300 hover:text-blue-500 p-2 rounded-lg transition-colors"><Edit3 className="w-5 h-5"/></button>
                   <button onClick={(e) => handleDelete(video.id, e)} className="text-gray-300 hover:text-red-500 p-2 rounded-lg transition-colors"><Trash2 className="w-5 h-5"/></button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
};


// ==========================================
// 3. MAIN DASHBOARD
// ==========================================
const Dashboard = ({ onStartModule, suggestedModule, userData, stats }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-gray-800">Chào mừng trở lại, {userData.name}! 👋</h2></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center mb-3"><Flame className="w-7 h-7" /></div>
          <p className="text-3xl font-black text-gray-800">{userData.streak}</p><p className="text-sm font-bold text-gray-400">Ngày liên tiếp</p>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center mb-3"><Award className="w-7 h-7" /></div>
          <p className="text-3xl font-black text-gray-800">{stats.totalXP}</p><p className="text-sm font-bold text-gray-400">Điểm kinh nghiệm</p>
        </div>
        <div className="col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-8 rounded-3xl shadow-lg shadow-blue-200 text-white flex flex-col justify-between">
          <div><h3 className="font-bold text-blue-200 mb-1 uppercase tracking-wider text-sm">Tiến độ khóa học</h3><p className="text-4xl font-black mb-6">{stats.overallProgress}% <span className="text-lg font-bold opacity-80">Hoàn thành</span></p></div>
          <ProgressBar progress={stats.overallProgress} colorClass="bg-white" heightClass="h-2.5" />
        </div>
      </div>
      <div>
        <h3 className="text-xl font-black text-gray-800 mb-4">Tiếp tục học</h3>
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-md ${suggestedModule.color}`}>{suggestedModule.icon}</div>
            <div><p className="text-xs font-black text-blue-600 mb-1 uppercase tracking-wider">Bài học gợi ý</p><h4 className="text-xl font-black text-gray-900">{suggestedModule.title}</h4></div>
          </div>
          <button onClick={() => onStartModule(suggestedModule)} className="w-full md:w-auto px-8 py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-lg">
            Học ngay <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// ROOT APP
// ==========================================
export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [viewingModule, setViewingModule] = useState(null);
  const [practiceConfig, setPracticeConfig] = useState(null); 
  const [firebaseUser, setFirebaseUser] = useState(null);
  
  // Hàm chuyển tab tùy chỉnh để dọn dẹp state làm bài cũ
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setViewingModule(null);
    setPracticeConfig(null);
  };
  
  // Data States
  const [userData, setUserData] = useState(() => { const s = localStorage.getItem('em_user'); return s ? JSON.parse(s) : DEFAULT_USER_DATA; });
  
  const [lessonsData, setLessonsData] = useState(() => { 
     const s = localStorage.getItem('em_lessons'); 
     if (s) {
        let parsed = JSON.parse(s);
        
        // Tương thích ngược: chuyển array cũ sang sets & Tự động sửa lại Tiêu đề bị dài
        Object.keys(parsed).forEach(key => {
           if (parsed[key].questions && !parsed[key].sets) {
              parsed[key].sets = [{ id: 'legacy_' + Date.now(), title: 'Bộ câu hỏi mặc định', questions: parsed[key].questions }];
              delete parsed[key].questions;
           }
        });
        
        if (parsed['vocab_env'] && parsed['vocab_env'].title === 'Từ vựng chủ đề: Environment (Môi trường)') {
            parsed['vocab_env'].title = 'Từ vựng chủ đề';
        }
        if (parsed['grammar_tenses'] && (parsed['grammar_tenses'].title === 'Ngữ pháp: Thì Hiện tại đơn (Present Simple)' || parsed['grammar_tenses'].title === 'Ngữ pháp toàn diện')) {
            parsed['grammar_tenses'].title = 'Ngữ pháp';
        }
        return parsed;
     }
     return INITIAL_LESSONS; 
  });
  
  const [userProgress, setUserProgress] = useState(() => { const s = localStorage.getItem('em_progress'); return s ? JSON.parse(s) : {}; });
  const [videoList, setVideoList] = useState(() => { const s = localStorage.getItem('em_videos'); return s ? JSON.parse(s) : INITIAL_VIDEOS; });

  // Init Firebase Auth
  useEffect(() => {
    if (!auth) return;

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          if (!auth.currentUser) await signInAnonymously(auth);
        }
      } catch(e) { console.error("Firebase Auth Error", e); }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (u && !u.isAnonymous && db) {
         try {
             const userDocRef = doc(collection(db, 'artifacts', appId, 'users', u.uid, 'appState'), 'main');
             const snap = await getDoc(userDocRef);
             if (snap.exists()) {
                const data = snap.data();
                if (data.videos) setVideoList(data.videos);
                if (data.progress) setUserProgress(data.progress);
             }
         } catch(e) { console.error("Cloud Fetch Error", e); }
      }
    });
    return () => unsubscribe();
  }, []);

  const videoListRef = useRef(videoList);
  const userProgressRef = useRef(userProgress);
  useEffect(() => { 
    videoListRef.current = videoList; 
    userProgressRef.current = userProgress;
  }, [videoList, userProgress]);

  useEffect(() => {
    if (!firebaseUser || firebaseUser.isAnonymous || !db) return;
    const interval = setInterval(() => {
      const userDocRef = doc(collection(db, 'artifacts', appId, 'users', firebaseUser.uid, 'appState'), 'main');
      setDoc(userDocRef, { 
         videos: videoListRef.current,
         progress: userProgressRef.current
      }, { merge: true }).catch(e => console.error("Cloud Sync Error", e));
    }, 5000); 
    return () => clearInterval(interval);
  }, [firebaseUser]);

  useEffect(() => {
    localStorage.setItem('em_user', JSON.stringify(userData));
    localStorage.setItem('em_lessons', JSON.stringify(lessonsData));
    localStorage.setItem('em_progress', JSON.stringify(userProgress));
    localStorage.setItem('em_videos', JSON.stringify(videoList));
  }, [userData, lessonsData, userProgress, videoList]);

  useEffect(() => {
    const today = new Date().toDateString();
    setUserData(prev => {
      let newStreak = prev.streak || 0;
      if (prev.lastActiveDate !== today) {
        if (!prev.lastActiveDate) newStreak = 1; 
        else {
          const diffDays = Math.ceil(Math.abs(new Date(today) - new Date(prev.lastActiveDate)) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) newStreak += 1; 
          else if (diffDays > 1) newStreak = 1; 
        }
      }
      return { ...prev, streak: newStreak, lastActiveDate: today };
    });
  }, []);

  const handleGoogleLogin = async () => {
    if (!auth) return alert("Hệ thống Database đang chạy offline, không thể đăng nhập Google.");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      alert("Đăng nhập thất bại: " + error.message);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    await signInAnonymously(auth);
    alert("Đã đăng xuất!");
  };

  let totalCorrect = 0; let totalAvailableItems = 0;
  Object.values(lessonsData).forEach(l => { 
     if (l.questions) totalAvailableItems += l.questions.length; 
     if (l.sets) l.sets.forEach(s => totalAvailableItems += s.questions.length);
  });
  Object.values(userProgress).forEach(p => { Object.values(p).forEach(s => { if (s === true) totalCorrect++; }); });
  
  // Tính điểm và tổng tiến độ có bao gồm cả tiến độ xem Video
  totalAvailableItems += videoList.length;
  const watchedVideosCount = videoList.filter(v => v.progress > 0).length;
  totalCorrect += watchedVideosCount;
  
  const stats = { totalXP: totalCorrect * 10, overallProgress: totalAvailableItems > 0 ? Math.round((totalCorrect / totalAvailableItems) * 100) : 0 };

  let suggestedModule = INITIAL_MODULES[0];
  for (const mod of INITIAL_MODULES) {
      if (mod.type === 'practice' && mod.linkedLessonId && lessonsData[mod.linkedLessonId]) {
          let totalQ = 0;
          if(lessonsData[mod.linkedLessonId].questions) totalQ += lessonsData[mod.linkedLessonId].questions.length;
          if(lessonsData[mod.linkedLessonId].sets) lessonsData[mod.linkedLessonId].sets.forEach(s => totalQ += s.questions.length);
          
          const cCount = userProgress[mod.linkedLessonId] ? Object.values(userProgress[mod.linkedLessonId]).filter(s => s===true).length : 0;
          if (cCount < totalQ) { suggestedModule = mod; break; }
      } else if (mod.type === 'video') {
          const totalV = videoList.length;
          const cCount = videoList.filter(v => v.progress > 0).length;
          if (cCount < totalV) { suggestedModule = mod; break; }
      }
  }

  useEffect(() => { window.scrollTo(0, 0); }, [activeTab, viewingModule]);

  const renderContent = () => {
    if (practiceConfig) return <LessonEngine practiceConfig={practiceConfig} setLessonsData={setLessonsData} onQuestionAnswered={(lId, qId, isC) => setUserProgress(p => ({...p, [lId]: {...(p[lId]||{}), [qId]: isC}}))} onComplete={()=>setPracticeConfig(null)} onExit={()=>setPracticeConfig(null)} />;
    
    if (viewingModule && viewingModule.type === 'video') return <VideoLibrary videos={videoList} setVideos={setVideoList} onBack={()=>setViewingModule(null)} />;
    
    if (viewingModule && viewingModule.type === 'practice') return <ModuleDetailsList module={viewingModule} lessonData={lessonsData[viewingModule.linkedLessonId]} userProgress={userProgress} setLessonsData={setLessonsData} onBack={()=>setViewingModule(null)} onStartPractice={(lId, qData) => setPracticeConfig({lessonId: lId, quizData: qData})} />;

    switch (activeTab) {
      case 'home': return <Dashboard onStartModule={setViewingModule} suggestedModule={suggestedModule} userData={userData} stats={stats} />;
      case 'learn': return (
          <div className="space-y-6 pb-20">
            <h2 className="text-2xl font-black text-gray-800">Lộ trình học tập</h2>
            <div className="grid grid-cols-1 gap-4">
              {INITIAL_MODULES.map((module) => {
                let progressText = ""; let progressPct = 0;
                
                if (module.type === 'video') {
                  const totalV = videoList.length;
                  const cCount = videoList.filter(v => v.progress > 0).length;
                  progressPct = totalV > 0 ? (cCount / totalV) * 100 : 0;
                  progressText = `${cCount}/${totalV} Đã xem`;
                } else {
                  const lessonId = module.linkedLessonId;
                  let totalQ = 0;
                  if (lessonId && lessonsData[lessonId]) {
                      if(lessonsData[lessonId].questions) totalQ += lessonsData[lessonId].questions.length;
                      if(lessonsData[lessonId].sets) lessonsData[lessonId].sets.forEach(s => totalQ += s.questions.length);
                  }
                  const cCount = lessonId && userProgress[lessonId] ? Object.values(userProgress[lessonId]).filter(s => s===true).length : 0;
                  progressPct = totalQ > 0 ? (cCount / totalQ) * 100 : 0;
                  progressText = `${cCount}/${totalQ} Hoàn thành`;
                }

                return (
                  <div key={module.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-md transition group" onClick={() => setViewingModule(module)}>
                    <div className="flex items-center gap-5">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform ${module.color}`}>{module.icon}</div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{module.title}</h3>
                        <p className="text-sm font-medium text-gray-500 mb-3">{module.description}</p>
                        <div className="flex items-center gap-3">
                           <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{progressText}</span>
                           <div className="w-24"><ProgressBar progress={progressPct} heightClass="h-1.5" /></div>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-blue-500 hidden md:block" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'profile': return (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-800">Hồ sơ cá nhân</h2>
            
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center">
               {firebaseUser && !firebaseUser.isAnonymous && firebaseUser.photoURL ? (
                 <img src={firebaseUser.photoURL} alt="Avatar" className="w-28 h-28 rounded-full border-4 border-blue-100 mb-4 shadow-sm object-cover" />
               ) : (
                 <div className="w-28 h-28 rounded-full bg-blue-50 text-blue-600 text-5xl font-black flex items-center justify-center mb-4 border-4 border-blue-100">{userData.name.charAt(0)}</div>
               )}
               
               <h3 className="text-2xl font-black text-gray-900">
                 {firebaseUser && !firebaseUser.isAnonymous && firebaseUser.displayName ? firebaseUser.displayName : userData.name}
               </h3>
               <p className="text-gray-500 font-bold mb-6">
                 {firebaseUser && !firebaseUser.isAnonymous && firebaseUser.email ? firebaseUser.email : userData.level}
               </p>
               
               {/* GOOGLE AUTH BUTTON */}
               {(!firebaseUser || firebaseUser.isAnonymous) ? (
                 <div className="mb-6 w-full max-w-sm">
                   <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-gray-200 hover:bg-gray-50 text-gray-800 font-bold rounded-xl transition-all shadow-sm">
                     <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                     Đăng nhập với Google
                   </button>
                   <p className="text-xs text-gray-400 mt-3 font-medium">Đăng nhập để đồng bộ tiến độ học tập và video đã xem lên Cloud.</p>
                 </div>
               ) : (
                 <button onClick={handleLogout} className="mb-6 px-6 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl transition-all">Đăng xuất tài khoản</button>
               )}

               <div className="flex gap-8 w-full max-w-sm justify-center border-t border-gray-100 pt-6">
                 <div><p className="text-4xl font-black text-orange-500">{userData.streak}</p><p className="text-xs text-gray-400 uppercase font-bold mt-1">Chuỗi ngày</p></div>
                 <div><p className="text-4xl font-black text-yellow-500">{stats.totalXP}</p><p className="text-xs text-gray-400 uppercase font-bold mt-1">Tổng XP</p></div>
               </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-sans flex text-gray-900">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} userData={userData} firebaseUser={firebaseUser} />
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto h-screen relative">
        <div className={`max-w-5xl mx-auto p-4 md:p-8 ${practiceConfig ? 'lg:px-10 lg:py-4' : 'lg:p-10'}`}>
          {renderContent()}
        </div>
      </main>
      {!practiceConfig && !viewingModule && <MobileNav activeTab={activeTab} setActiveTab={handleTabChange} />}
    </div>
  );
}