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
                        <div 
