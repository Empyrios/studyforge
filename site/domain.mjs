export const STORAGE_KEY = 'studyforge:data:v1';
export const VERSION = 1;
export const RAGS = Object.freeze(['red', 'amber', 'green']);
export const KINDS = Object.freeze(['revision', 'flashcards', 'quiz']);
export const INITIAL = () => ({version: VERSION, subjects: [], topics: [], cards: [], questions: [], sessions: []});
export const isoToday = (date = new Date()) => [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
export const validDate = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x+'T00:00:00Z')) && new Date(x+'T00:00:00Z').toISOString().slice(0,10) === x;
export const addDays = (iso, n) => {if(!validDate(iso) || !Number.isInteger(n) || Math.abs(n)>100000)throw new Error('Invalid date offset'); const d = new Date(iso+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10);};
export const daysBetween = (a,b) => validDate(a)&&validDate(b) ? Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000) : null;
export const makeId = () => {if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID().replaceAll('-',''); return 'sf_'+Math.random().toString(36).slice(2)+Date.now().toString(36);};
const string = (x,max) => typeof x==='string' ? x.trim().slice(0,max) : '';
const validId = x => typeof x==='string' && /^[a-zA-Z0-9_-]{1,90}$/.test(x);
const check = (condition, message) => {if(!condition)throw new Error(message);};
const dateOrBlank = x => x==='' || x==null ? '' : (validDate(x) ? x : (()=>{throw new Error('Invalid date')})());
const integer = (x,lo,hi) => Number.isInteger(x) && x>=lo && x<=hi;
const unique = rows => {const seen=new Set();for(const row of rows){check(validId(row.id),'Invalid record ID');check(!seen.has(row.id),'Duplicate ID');seen.add(row.id);}return seen;};
export function validateState(raw){
  check(raw && typeof raw==='object' && !Array.isArray(raw) && raw.version===VERSION,'Unsupported or malformed backup');
  const names=['subjects','topics','cards','questions','sessions'];
  for(const name of names)check(Array.isArray(raw[name]) && raw[name].length<=2500,`Invalid ${name} collection`);
  const subjectIds=unique(raw.subjects), topicIds=unique(raw.topics);
  for(const name of ['cards','questions','sessions'])unique(raw[name]);
  const subjects=raw.subjects.map(s=>{const name=string(s.name,90);check(name,'Subject name required');return {id:s.id,name,color:['violet','teal','amber','rose','blue'].includes(s.color)?s.color:'violet',examDate:dateOrBlank(s.examDate)};});
  const topics=raw.topics.map(t=>{check(subjectIds.has(t.subjectId),'Topic refers to missing subject');const title=string(t.title,130);check(title,'Topic title required');return {id:t.id,subjectId:t.subjectId,title,rag:RAGS.includes(t.rag)?t.rag:'red',watched:integer(t.watched,0,3)?t.watched:0,reviewAt:dateOrBlank(t.reviewAt),lastReviewed:dateOrBlank(t.lastReviewed),notes:string(t.notes,5000)};});
  const cards=raw.cards.map(c=>{check(topicIds.has(c.topicId),'Card refers to missing topic');const front=string(c.front,1200),back=string(c.back,2400);check(front&&back,'Card needs front and back');return {id:c.id,topicId:c.topicId,front,back,dueAt:dateOrBlank(c.dueAt),lastReviewed:dateOrBlank(c.lastReviewed),interval:integer(c.interval,0,36500)?c.interval:0,ease:typeof c.ease==='number'&&Number.isFinite(c.ease)&&c.ease>=1.3&&c.ease<=4?Number(c.ease.toFixed(2)):2.5,repetitions:integer(c.repetitions,0,10000)?c.repetitions:0,reviews:integer(c.reviews,0,100000)?c.reviews:0};});
  const questions=raw.questions.map(q=>{check(topicIds.has(q.topicId),'Question refers to missing topic');const stem=string(q.stem,1400);check(stem,'Question required');check(Array.isArray(q.options)&&q.options.length===4,'Each MCQ needs exactly four options');const options=q.options.map(a=>string(a,700));check(options.every(Boolean),'All options required');check(integer(q.answer,0,3),'Invalid correct answer');return {id:q.id,topicId:q.topicId,stem,options,answer:q.answer,explanation:string(q.explanation,2800)};});
  const sessions=raw.sessions.map(s=>{check(topicIds.has(s.topicId),'Session refers to missing topic');check(KINDS.includes(s.kind),'Unknown session kind');check(validDate(s.date),'Invalid session date');check(integer(s.minutes,0,1440),'Invalid session duration');check(integer(s.correct,0,10000)&&integer(s.total,0,10000)&&s.correct<=s.total,'Invalid score');return {id:s.id,topicId:s.topicId,kind:s.kind,date:s.date,minutes:s.minutes,correct:s.correct,total:s.total};});
  return {version: VERSION,subjects,topics,cards,questions,sessions};
}
export function topicCards(state,topicId){return state.cards.filter(c=>c.topicId===topicId)}
export function dueCards(state,day=isoToday(),topicId='all'){
  return state.cards.filter(c=>(topicId==='all'||c.topicId===topicId)&&(!c.dueAt||c.dueAt<=day)).sort((a,b)=>(a.dueAt||'0000').localeCompare(b.dueAt||'0000')||a.front.localeCompare(b.front));
}
export function reviewCard(card,grade,day=isoToday()){
  check(validDate(day),'Invalid review date');check(integer(grade,0,3),'Unknown review grade');
  const reps=card.repetitions||0, prev=card.interval||0, ease=card.ease||2.5;
  let interval,nextEase=ease,nextReps=reps;
  if(grade===0){interval=0;nextEase=Math.max(1.3,ease-0.2);nextReps=0;}
  else if(grade===1){interval=Math.max(1,Math.ceil(prev*1.2));nextEase=Math.max(1.3,ease-0.15);nextReps=reps+1;}
  else if(grade===2){interval=reps===0?1:reps===1?3:Math.max(1,Math.round(prev*ease));nextReps=reps+1;}
  else {interval=reps===0?4:Math.max(5,Math.round(Math.max(1,prev)*ease*1.3));nextEase=Math.min(4,ease+0.15);nextReps=reps+1;}
  interval=Math.min(interval,36500);
  return {...card,interval,ease:Number(nextEase.toFixed(2)),repetitions:nextReps,reviews:(card.reviews||0)+1,lastReviewed:day,dueAt:addDays(day,interval)};
}
export function dashboard(state,day=isoToday()){
  const due=dueCards(state,day).length;
  const highPriority=state.topics.filter(t=>t.rag==='red'||(t.reviewAt&&t.reviewAt<=day)).length;
  const exams=state.subjects.filter(s=>s.examDate&&s.examDate>=day).map(s=>({...s,daysAway:daysBetween(day,s.examDate)})).sort((a,b)=>a.daysAway-b.daysAway);
  const recent=state.sessions.filter(s=>daysBetween(s.date,day)!==null&&daysBetween(s.date,day)>=0&&daysBetween(s.date,day)<7);
  const minutes=recent.reduce((v,s)=>v+s.minutes,0);
  return {due,highPriority,exams,minutes,subjects:state.subjects.length,topics:state.topics.length,questions:state.questions.length};
}
export function subjectProgress(state,subjectId){
  const topics=state.topics.filter(t=>t.subjectId===subjectId);
  const covered=topics.filter(t=>t.watched>0).length;
  const confident=topics.filter(t=>t.rag==='green').length;
  return {count:topics.length,covered,confident,coverage:topics.length?Math.round(covered/topics.length*100):0,confidence:topics.length?Math.round(confident/topics.length*100):0};
}
export function deleteSubject(state,id){
  const ids=new Set(state.topics.filter(t=>t.subjectId===id).map(t=>t.id));
  return {...state,subjects:state.subjects.filter(s=>s.id!==id),topics:state.topics.filter(t=>!ids.has(t.id)),cards:state.cards.filter(c=>!ids.has(c.topicId)),questions:state.questions.filter(q=>!ids.has(q.topicId)),sessions:state.sessions.filter(s=>!ids.has(s.topicId))};
}
export function deleteTopic(state,id){return {...state,topics:state.topics.filter(t=>t.id!==id),cards:state.cards.filter(c=>c.topicId!==id),questions:state.questions.filter(q=>q.topicId!==id),sessions:state.sessions.filter(s=>s.topicId!==id)};}
export function pickQuestions(state,topicId='all',limit=10){const list=state.questions.filter(q=>topicId==='all'||q.topicId===topicId);return list.slice(0,Math.max(1,Math.min(100,limit)));}
export function scoreQuestion(question,option){check(integer(option,0,3),'Invalid answer');return {correct:question.answer===option,answer:question.answer,explanation:question.explanation};}
export function sampleState(day=isoToday()){
 const sub=[{id:'sample_sa',name:'Small Animal Endocrinology',color:'violet',examDate:addDays(day,28)},{id:'sample_farm',name:'Farm Animal Medicine',color:'teal',examDate:addDays(day,28)}];
 const topics=[{id:'sample_dm',subjectId:'sample_sa',title:'Canine and feline diabetes mellitus',rag:'amber',watched:2,reviewAt:day,lastReviewed:'',notes:'Fictional study content for demonstration only.'},{id:'sample_cushing',subjectId:'sample_sa',title:'Hyperadrenocorticism',rag:'red',watched:1,reviewAt:day,lastReviewed:'',notes:''},{id:'sample_cattle',subjectId:'sample_farm',title:'Cattle reproduction and fertility',rag:'green',watched:3,reviewAt:addDays(day,4),lastReviewed:day,notes:''}];
 const cards=[['sample_c1','sample_dm','Which pancreatic cells secrete insulin?','Beta cells in the islets of Langerhans.'],['sample_c2','sample_dm','What does polyuria mean?','Increased urine volume.'],['sample_c3','sample_cushing','What is ACTH?','Adrenocorticotropic hormone, which stimulates cortisol production.'],['sample_c4','sample_cattle','What is anoestrus?','Absence of observable oestrous cycles.']].map(([id,topicId,front,back])=>({id,topicId,front,back,dueAt:day,lastReviewed:'',interval:0,ease:2.5,repetitions:0,reviews:0}));
 const questions=[{id:'sample_q1',topicId:'sample_dm',stem:'Which hormone reduces blood glucose by promoting uptake into insulin-sensitive tissues?',options:['Glucagon','Insulin','Cortisol','Adrenaline'],answer:1,explanation:'Insulin promotes glucose uptake and storage, reducing blood glucose.'},{id:'sample_q2',topicId:'sample_cushing',stem:'Hyperadrenocorticism is associated with excessive exposure to which hormone?',options:['Insulin','Thyroxine','Cortisol','Aldosterone'],answer:2,explanation:'Cushing\'s syndrome reflects chronic glucocorticoid excess.'},{id:'sample_q3',topicId:'sample_cattle',stem:'Which term describes a period without detectable oestrus?',options:['Anoestrus','Oestrus','Dystocia','Ovulation'],answer:0,explanation:'Anoestrus means the absence of detectable oestrus.'}];
 return validateState({...INITIAL(),subjects:sub,topics,cards,questions});
}
export function toCsv(state){
 const esc=v=>{const s=String(v??'');const clean=/^[=+@\-\t\r]/.test(s)?"'"+s:s;return '"'+clean.replaceAll('"','""')+'"';};
 return ['Subject,Topic,RAG,Watched,Next review,Last review',...state.topics.map(t=>{const sub=state.subjects.find(s=>s.id===t.subjectId);return [sub?.name||'',t.title,t.rag,t.watched,t.reviewAt,t.lastReviewed].map(esc).join(',')})].join('\r\n')+'\r\n';
}
