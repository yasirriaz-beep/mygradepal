'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const PRICE = 5000
const subjects = ['Chemistry','Physics','Mathematics','Biology','English','Pakistan Studies','Islamiyat','Science']
const sessions = ['May/June','Oct/Nov','Annual']
const types = ['theory','mcq','practical']
const tiers = ['certain','very_likely','likely','possible']
const grades = ['igcse','lower_secondary']

function AdminPanel() {
  const [tab, setTab] = useState('add')
  const [questions, setQuestions] = useState([])
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({
    subject:'Chemistry', grade_level:'igcse', year:2023,
    session:'May/June', paper_type:'theory', paper_code:'',
    question_number:'', topic:'', subtopic:'', marks:3,
    difficulty:3, frequency_score:80, prediction_tier:'likely',
    question_text:'', mark_scheme:''
  })
  const [bulkText, setBulkText] = useState('')

  const s = {
    page: {fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f0f8f7',padding:'24px'},
    header: {background:'#189080',color:'white',padding:'16px 24px',borderRadius:'12px',marginBottom:'20px',display:'flex',alignItems:'center',justifyContent:'space-between'},
    logo: {fontSize:'20px',fontWeight:'800'},
    tabs: {display:'flex',gap:'8px',marginBottom:'20px'},
    tabActive: {padding:'10px 20px',background:'#189080',color:'white',border:'none',borderRadius:'100px',cursor:'pointer',fontWeight:'600',fontSize:'14px'},
    tabInactive: {padding:'10px 20px',background:'white',color:'#189080',border:'1px solid #189080',borderRadius:'100px',cursor:'pointer',fontSize:'14px'},
    card: {background:'white',borderRadius:'16px',padding:'24px',border:'1px solid #d0f7f2'},
    label: {display:'block',marginBottom:'6px',fontWeight:'500',color:'#2d5252',fontSize:'13px'},
    input: {width:'100%',padding:'10px 12px',border:'1px solid #d0f7f2',borderRadius:'8px',marginBottom:'14px',fontSize:'14px',fontFamily:'system-ui',boxSizing:'border-box' as const},
    textarea: {width:'100%',padding:'10px 12px',border:'1px solid #d0f7f2',borderRadius:'8px',marginBottom:'14px',fontSize:'14px',fontFamily:'system-ui',boxSizing:'border-box' as const,resize:'vertical' as const},
    select: {width:'100%',padding:'10px 12px',border:'1px solid #d0f7f2',borderRadius:'8px',marginBottom:'14px',fontSize:'14px',fontFamily:'system-ui',boxSizing:'border-box' as const},
    btn: {padding:'12px 28px',background:'#189080',color:'white',border:'none',borderRadius:'100px',cursor:'pointer',fontWeight:'600',fontSize:'15px'},
    btnDanger: {padding:'4px 12px',background:'#fee2e2',color:'#991b1b',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'12px'},
    msg: {padding:'12px',background:'#d0f7f2',borderRadius:'8px',marginBottom:'16px',color:'#0f5550',fontWeight:'500'},
    th: {textAlign:'left' as const,padding:'10px 12px',background:'#f0f8f7',borderBottom:'1px solid #d0f7f2',fontSize:'12px',color:'#5a8a88',fontWeight:'600'},
    td: {padding:'10px 12px',borderBottom:'1px solid #f0f0ee',fontSize:'13px'},
    row: {cursor:'pointer', transition:'background .15s ease'},
    detailCard: {marginTop:'16px',border:'1px solid #d0f7f2',borderRadius:'12px',padding:'16px',background:'#fafdfc'},
    detailBox: {background:'white',border:'1px solid #d0f7f2',borderRadius:'10px',padding:'12px',whiteSpace:'pre-wrap' as const,lineHeight:'1.6'},
    badge: {display:'inline-block',padding:'4px 10px',borderRadius:'999px',background:'#edfaf8',color:'#137066',fontSize:'12px',fontWeight:600,marginRight:'8px'},
  }

  useEffect(() => {
    if (tab === 'view') loadQuestions()
  }, [tab])

  async function loadQuestions() {
    const res = await fetch('/api/admin/questions')
    const data = await res.json()
    if (data.questions) setQuestions(data.questions)
  }

  async function submitQuestion() {
    const res = await fetch('/api/admin/add-question', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (data.success) {
      setMsg('Question added successfully!')
      setForm(f => ({...f, question_text:'', mark_scheme:'', question_number:''}))
    } else {
      setMsg('Error: ' + (data.error || 'unknown'))
    }
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return
    await fetch('/api/admin/delete-question', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({id})
    })
    setQuestions((q: any[]) => q.filter((x: any) => x.id !== id))
  }

  function getPreview(text: string) {
    if (!text) return '-'
    return text.length > 60 ? `${text.slice(0, 60)}...` : text
  }

  async function bulkImport() {
    const res = await fetch('/api/admin/bulk-import', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({text: bulkText})
    })
    const data = await res.json()
    setMsg(`Imported ${data.imported || 0} questions`)
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.logo}>MyGradePal Admin</div>
        <div style={{fontSize:'13px',opacity:0.8}}>Content Management</div>
      </div>

      {msg && <div style={s.msg}>{msg}</div>}

      <div style={s.tabs}>
        <button style={tab==='add' ? s.tabActive : s.tabInactive} onClick={() => setTab('add')}>Add Question</button>
        <button style={tab==='bulk' ? s.tabActive : s.tabInactive} onClick={() => setTab('bulk')}>Bulk Import</button>
        <button style={tab==='view' ? s.tabActive : s.tabInactive} onClick={() => setTab('view')}>View Questions</button>
      </div>

      {tab === 'add' && (
        <div style={s.card}>
          <h2 style={{marginBottom:'20px',color:'#0e1a1a'}}>Add New Question</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 20px'}}>
            <div>
              <label style={s.label}>Subject</label>
              <select style={s.select} value={form.subject} onChange={e => setForm(f => ({...f,subject:e.target.value}))}>
                {subjects.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Grade Level</label>
              <select style={s.select} value={form.grade_level} onChange={e => setForm(f => ({...f,grade_level:e.target.value}))}>
                {grades.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Year</label>
              <input style={s.input} type="number" value={form.year} onChange={e => setForm(f => ({...f,year:+e.target.value}))} />
            </div>
            <div>
              <label style={s.label}>Session</label>
              <select style={s.select} value={form.session} onChange={e => setForm(f => ({...f,session:e.target.value}))}>
                {sessions.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Paper Type</label>
              <select style={s.select} value={form.paper_type} onChange={e => setForm(f => ({...f,paper_type:e.target.value}))}>
                {types.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Paper Code</label>
              <input style={s.input} value={form.paper_code} onChange={e => setForm(f => ({...f,paper_code:e.target.value}))} placeholder="e.g. 0620/22" />
            </div>
            <div>
              <label style={s.label}>Question Number</label>
              <input style={s.input} value={form.question_number} onChange={e => setForm(f => ({...f,question_number:e.target.value}))} placeholder="e.g. 3b" />
            </div>
            <div>
              <label style={s.label}>Topic</label>
              <input style={s.input} value={form.topic} onChange={e => setForm(f => ({...f,topic:e.target.value}))} placeholder="e.g. Stoichiometry" />
            </div>
            <div>
              <label style={s.label}>Subtopic</label>
              <input style={s.input} value={form.subtopic} onChange={e => setForm(f => ({...f,subtopic:e.target.value}))} placeholder="e.g. Mole calculations" />
            </div>
            <div>
              <label style={s.label}>Marks</label>
              <input style={s.input} type="number" value={form.marks} onChange={e => setForm(f => ({...f,marks:+e.target.value}))} />
            </div>
            <div>
              <label style={s.label}>Difficulty (1-5)</label>
              <input style={s.input} type="number" min={1} max={5} value={form.difficulty} onChange={e => setForm(f => ({...f,difficulty:+e.target.value}))} />
            </div>
            <div>
              <label style={s.label}>Frequency Score (0-100)</label>
              <input style={s.input} type="number" min={0} max={100} value={form.frequency_score} onChange={e => setForm(f => ({...f,frequency_score:+e.target.value}))} />
            </div>
            <div>
              <label style={s.label}>Prediction Tier</label>
              <select style={s.select} value={form.prediction_tier} onChange={e => setForm(f => ({...f,prediction_tier:e.target.value}))}>
                {tiers.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <label style={s.label}>Question Text</label>
          <textarea style={{...s.textarea,minHeight:'120px'}} value={form.question_text} onChange={e => setForm(f => ({...f,question_text:e.target.value}))} placeholder="Enter the full question text here..." />
          <label style={s.label}>Mark Scheme</label>
          <textarea style={{...s.textarea,minHeight:'120px'}} value={form.mark_scheme} onChange={e => setForm(f => ({...f,mark_scheme:e.target.value}))} placeholder="Enter the mark scheme here..." />
          <button style={s.btn} onClick={submitQuestion}>Add Question</button>
        </div>
      )}

      {tab === 'bulk' && (
        <div style={s.card}>
          <h2 style={{marginBottom:'12px',color:'#0e1a1a'}}>Bulk Import Questions</h2>
          <p style={{fontSize:'13px',color:'#5a8a88',marginBottom:'16px',lineHeight:'1.6'}}>
            Paste questions in this format. Separate multiple questions with ---
          </p>
          <div style={{background:'#f0f8f7',borderRadius:'8px',padding:'12px',marginBottom:'16px',fontSize:'12px',fontFamily:'monospace',color:'#2d5252',lineHeight:'1.8'}}>
            SUBJECT: Chemistry<br/>
            TOPIC: Stoichiometry<br/>
            YEAR: 2022<br/>
            SESSION: May/June<br/>
            TYPE: theory<br/>
            MARKS: 3<br/>
            QUESTION:<br/>
            [question text]<br/>
            MARKSCHEME:<br/>
            [mark scheme]<br/>
            ---
          </div>
          <textarea 
            style={{...s.textarea,minHeight:'300px'}} 
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder="Paste your questions here..."
          />
          <button style={s.btn} onClick={bulkImport}>Import Questions</button>
        </div>
      )}

      {tab === 'view' && (
        <div style={s.card}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
            <h2 style={{color:'#0e1a1a'}}>Questions ({questions.length})</h2>
            <button style={{...s.btn,fontSize:'13px',padding:'8px 16px'}} onClick={loadQuestions}>Refresh</button>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={s.th}>Subject</th>
                  <th style={s.th}>Topic</th>
                  <th style={s.th}>Year</th>
                  <th style={s.th}>Preview</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Marks</th>
                  <th style={s.th}>Grade</th>
                  <th style={s.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(questions as any[]).map((q: any) => (
                  <tr
                    key={q.id}
                    style={{
                      ...s.row,
                      background: selectedQuestion?.id === q.id ? '#edf8f7' : 'transparent',
                      borderLeft: selectedQuestion?.id === q.id ? '4px solid #189080' : '4px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedQuestion?.id !== q.id) {
                        (e.currentTarget as HTMLTableRowElement).style.background = '#f7fbfa'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedQuestion?.id !== q.id) {
                        (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'
                      }
                    }}
                    onClick={() => setSelectedQuestion(q)}
                  >
                    <td style={s.td}>{q.subject}</td>
                    <td style={s.td}>{q.topic}</td>
                    <td style={s.td}>{q.year}</td>
                    <td style={s.td}>{getPreview(q.question_text || '')}</td>
                    <td style={s.td}>{q.paper_type}</td>
                    <td style={s.td}>{q.marks}</td>
                    <td style={s.td}>{q.grade_level}</td>
                    <td style={s.td}>
                      <button style={s.btnDanger} onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id) }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {questions.length === 0 && (
              <p style={{textAlign:'center',color:'#5a8a88',padding:'40px'}}>No questions found. Click Refresh.</p>
            )}
          </div>

          {selectedQuestion && (
            <div style={s.detailCard}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',gap:'10px',flexWrap:'wrap'}}>
                <div>
                  <span style={s.badge}>{selectedQuestion.subject || 'Unknown'}</span>
                  <span style={s.badge}>{selectedQuestion.topic || 'No topic'}</span>
                  <span style={s.badge}>{selectedQuestion.year || '-'}</span>
                  <span style={s.badge}>{selectedQuestion.session || 'No session'}</span>
                </div>
                <div style={{display:'flex',gap:'8px'}}>
                  <button style={{...s.btn, padding:'8px 16px', fontSize:'13px'}}>Edit</button>
                  <button
                    style={{...s.tabInactive, padding:'8px 16px', fontSize:'13px'}}
                    onClick={() => setSelectedQuestion(null)}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div style={{marginBottom:'10px',fontSize:'13px',fontWeight:600,color:'#2d5252'}}>Question Text</div>
              <div style={s.detailBox}>{selectedQuestion.question_text || 'No question text available.'}</div>

              <div style={{margin:'14px 0 10px',fontSize:'13px',fontWeight:600,color:'#2d5252'}}>Mark Scheme</div>
              <div style={s.detailBox}>{selectedQuestion.mark_scheme || 'No mark scheme available.'}</div>

              <div style={{marginTop:'12px',fontSize:'12px',color:'#5a8a88'}}>
                <strong>Paper:</strong> {selectedQuestion.paper_code || '-'} | <strong>Q#:</strong> {selectedQuestion.question_number || '-'} | <strong>Subtopic:</strong> {selectedQuestion.subtopic || '-'} | <strong>Difficulty:</strong> {selectedQuestion.difficulty ?? '-'} | <strong>Frequency:</strong> {selectedQuestion.frequency_score ?? '-'} | <strong>Tier:</strong> {selectedQuestion.prediction_tier || '-'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AdminCheck() {
  const searchParams = useSearchParams()
  const key = searchParams.get('key')
  if (key !== 'mgp2025') {
    return (
      <div style={{padding:'40px',textAlign:'center',fontFamily:'system-ui'}}>
        <h1 style={{color:'#991b1b'}}>Access Denied</h1>
        <p style={{color:'#666',marginTop:'8px'}}>Invalid or missing access key</p>
      </div>
    )
  }
  return <AdminPanel />
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{padding:'40px',textAlign:'center'}}>Loading...</div>}>
      <AdminCheck />
    </Suspense>
  )
}
