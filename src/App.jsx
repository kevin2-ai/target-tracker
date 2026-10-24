import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowUpRight, BarChart3, CalendarDays,
  Check, CheckCircle2, ChevronDown, ChevronRight, Circle, Clock3, Download,
  FolderPlus, Goal, LayoutDashboard, MoreHorizontal, Plus, Search, Settings2,
  Sparkles, Target, Timer, Trash2, TrendingUp, Upload, X
} from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Brush
} from 'recharts'
import { loadState, saveState } from './storage.js'

const DAY = 86400000
const todayISO = () => new Date().toLocaleDateString('en-CA')
const dateOffset = (date, days) => new Date(new Date(`${date}T12:00:00`).getTime() + days * DAY).toLocaleDateString('en-CA')
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
const initialState = {
  objectives: [
    { id: 'demo-1', parentId: null, title: 'Construire mon avenir', description: 'Les grands objectifs commencent par des actions régulières.', color: '#8b7cff', createdAt: todayISO(), done: false },
    { id: 'demo-2', parentId: 'demo-1', title: 'Développer mes compétences', description: 'Apprendre et pratiquer chaque semaine.', color: '#53c8f5', createdAt: todayISO(), done: false },
    { id: 'demo-3', parentId: 'demo-2', title: 'Apprendre React', description: 'Comprendre les composants et construire des projets.', color: '#53c8f5', createdAt: todayISO(), done: false },
    { id: 'demo-4', parentId: 'demo-2', title: 'Pratiquer la programmation', description: 'Coder un peu chaque jour.', color: '#c5a5ff', createdAt: todayISO(), done: false },
    { id: 'demo-5', parentId: 'demo-1', title: 'Prendre soin de ma santé', description: 'Construire une routine durable.', color: '#55d6a3', createdAt: todayISO(), done: false }
  ],
  logs: [
    { id: 'log-1', objectiveId: 'demo-3', date: dateOffset(todayISO(), -6), minutes: 35, note: 'Premiers composants' },
    { id: 'log-2', objectiveId: 'demo-3', date: dateOffset(todayISO(), -4), minutes: 50, note: 'Props et état' },
    { id: 'log-3', objectiveId: 'demo-4', date: dateOffset(todayISO(), -3), minutes: 40, note: 'Exercices' },
    { id: 'log-4', objectiveId: 'demo-3', date: dateOffset(todayISO(), -1), minutes: 60, note: 'Mini-projet' }
  ]
}

const COLORS = ['#8b7cff', '#53c8f5', '#55d6a3', '#ffb86b', '#ff7d9b', '#c5a5ff']
const fmtMinutes = (minutes) => {
  const h = Math.floor(minutes / 60), m = minutes % 60
  if (h && m) return `${h} h ${m} min`
  if (h) return `${h} h`
  return `${m} min`
}
const fmtShort = (minutes) => minutes >= 60 ? `${(minutes / 60).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} h` : `${minutes} min`
const fmtDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
const getChildren = (objectives, id) => objectives.filter(o => o.parentId === id)
const isDescendant = (objectives, candidateId, ancestorId) => {
  let current = objectives.find(o => o.id === candidateId)
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true
    current = objectives.find(o => o.id === current.parentId)
  }
  return false
}

function App() {
  const [data, setData] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState(30)
  const [notice, setNotice] = useState('')
  const fileInput = useRef(null)

  useEffect(() => {
    let active = true
    loadState().then(saved => {
      if (!active) return
      const next = saved?.objectives && saved?.logs ? saved : initialState
      setData(next)
      setSelectedId(next.objectives.find(o => !o.parentId)?.id || null)
      setExpanded(Object.fromEntries(next.objectives.map(o => [o.id, true])))
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (data) saveState(data)
  }, [data])

  const objectives = data?.objectives || []
  const logs = data?.logs || []
  const selected = objectives.find(o => o.id === selectedId) || objectives[0]
  const childrenOf = (id) => getChildren(objectives, id)
  const isLeaf = (id) => childrenOf(id).length === 0

  const logsFor = (id) => {
    const ids = new Set([id, ...objectives.filter(o => isDescendant(objectives, o.id, id)).map(o => o.id)])
    const relevant = logs.filter(l => ids.has(l.objectiveId))
    const descendants = objectives.some(o => o.parentId === id)
    return relevant.filter(l => {
      const logObjective = objectives.find(o => o.id === l.objectiveId)
      return logObjective && (!descendants || isDescendant(objectives, logObjective.id, id))
    })
  }
  const totalMinutes = (id) => logsFor(id).reduce((sum, log) => sum + log.minutes, 0)
  const leafCount = (id) => {
    const children = childrenOf(id)
    return children.length ? children.reduce((sum, child) => sum + leafCount(child.id), 0) : 1
  }
  const completion = (id) => {
    const children = childrenOf(id)
    if (!children.length) return objectives.find(o => o.id === id)?.done ? 100 : 0
    return children.reduce((sum, child) => sum + completion(child.id), 0) / children.length
  }
  const allProgress = objectives.length ? Math.round(objectives.filter(o => !o.parentId).reduce((sum, o) => sum + completion(o.id), 0) / Math.max(1, objectives.filter(o => !o.parentId).length)) : 0
  const todayMinutes = logs.filter(l => l.date === todayISO()).reduce((sum, l) => sum + l.minutes, 0)
  const weekMinutes = logs.filter(l => l.date >= dateOffset(todayISO(), -6) && l.date <= todayISO()).reduce((sum, l) => sum + l.minutes, 0)
  const activeCount = objectives.filter(o => !o.done).length

  const chartData = useMemo(() => {
    if (!selected) return []
    const start = dateOffset(todayISO(), -(period - 1))
    const all = logsFor(selected.id)
    const map = new Map()
    all.forEach(log => map.set(log.date, (map.get(log.date) || 0) + log.minutes))
    return Array.from({ length: period }, (_, i) => {
      const date = dateOffset(start, i)
      return { date, label: fmtDate(date), minutes: map.get(date) || 0 }
    })
  }, [selectedId, data, period])

  const setAndNotify = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 3000)
  }

  function addObjective({ title, description, parentId }) {
    if (!title.trim()) return
    const id = uid()
    const newObjective = { id, parentId: parentId || null, title: title.trim(), description: description.trim(), color: COLORS[objectives.length % COLORS.length], createdAt: todayISO(), done: false }
    setData(prev => {
      let nextObjectives = [...prev.objectives]
      let nextLogs = [...prev.logs]
      // Preserve existing leaf sessions if it becomes a parent.
      if (parentId && nextLogs.some(log => log.objectiveId === parentId)) {
        const parent = nextObjectives.find(o => o.id === parentId)
        const legacyId = uid()
        nextObjectives.push({ id: legacyId, parentId, title: 'Travail avant décomposition', description: 'Sessions enregistrées avant la création des sous-objectifs.', color: parent?.color || COLORS[0], createdAt: todayISO(), done: false })
        nextLogs = nextLogs.map(log => log.objectiveId === parentId ? { ...log, objectiveId: legacyId } : log)
      }
      nextObjectives.push(newObjective)
      return { objectives: nextObjectives, logs: nextLogs }
    })
    setExpanded(prev => ({ ...prev, [parentId]: true, [id]: true }))
    setSelectedId(id)
    setModal(null)
    setAndNotify('Objectif créé.')
  }

  function addLog({ date, hours, minutes, note }) {
    const total = Number(hours || 0) * 60 + Number(minutes || 0)
    if (!selected || !isLeaf(selected.id) || total <= 0) return
    setData(prev => ({ ...prev, logs: [...prev.logs, { id: uid(), objectiveId: selected.id, date, minutes: total, note: note.trim() }] }))
    setModal(null)
    setAndNotify('Session enregistrée.')
  }

  function toggleDone(id) {
    setData(prev => ({ ...prev, objectives: prev.objectives.map(o => o.id === id ? { ...o, done: !o.done } : o) }))
  }

  function deleteObjective(id) {
    const toDelete = new Set([id, ...objectives.filter(o => isDescendant(objectives, o.id, id)).map(o => o.id)])
    if (!window.confirm('Supprimer cet objectif, tous ses sous-objectifs et leurs sessions ? Cette action est irréversible.')) return
    setData(prev => ({ objectives: prev.objectives.filter(o => !toDelete.has(o.id)), logs: prev.logs.filter(l => !toDelete.has(l.objectiveId)) }))
    if (toDelete.has(selectedId)) setSelectedId(objectives.find(o => !toDelete.has(o.id) && !o.parentId)?.id || null)
    setAndNotify('Objectif supprimé.')
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `orbit-sauvegarde-${todayISO()}.json`; a.click()
    URL.revokeObjectURL(url)
    setAndNotify('Sauvegarde exportée.')
  }

  async function importData(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      if (!Array.isArray(parsed.objectives) || !Array.isArray(parsed.logs)) throw new Error('Format invalide')
      if (!window.confirm('Importer cette sauvegarde et remplacer les données actuelles ?')) return
      setData({ objectives: parsed.objectives, logs: parsed.logs })
      setSelectedId(parsed.objectives.find(o => !o.parentId)?.id || null)
      setExpanded(Object.fromEntries(parsed.objectives.map(o => [o.id, true])))
      setAndNotify('Sauvegarde importée.')
    } catch {
      setAndNotify('Fichier invalide : sélectionne une sauvegarde Orbit JSON.')
    } finally { event.target.value = '' }
  }

  function renderTree(id, depth = 0) {
    const obj = objectives.find(o => o.id === id)
    if (!obj) return null
    const children = childrenOf(id)
    const matches = !search || obj.title.toLowerCase().includes(search.toLowerCase())
    const childMatches = children.some(child => {
      const recursiveMatch = (nodeId) => {
        const node = objectives.find(o => o.id === nodeId)
        return node?.title.toLowerCase().includes(search.toLowerCase()) || childrenOf(nodeId).some(c => recursiveMatch(c.id))
      }
      return recursiveMatch(child.id)
    })
    if (search && !matches && !childMatches) return null
    const open = expanded[id] || !!search
    return <div key={id}>
      <div className={`tree-row ${selectedId === id ? 'selected' : ''} ${obj.done ? 'is-done' : ''}`} style={{ paddingLeft: 10 + depth * 15 }}>
        <button className="tree-expand" aria-label={open ? 'Réduire' : 'Développer'} onClick={() => setExpanded(p => ({ ...p, [id]: !p[id] }))}>
          {children.length ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="leaf-dot" />}
        </button>
        <button className="tree-select" onClick={() => setSelectedId(id)}>
          <span className="tree-color" style={{ background: obj.color }} />
          <span className="tree-name">{obj.title}</span>
          {obj.done && <CheckCircle2 size={13} className="done-icon" />}
        </button>
        <span className="tree-percent">{Math.round(completion(id))}%</span>
      </div>
      {open && children.map(child => renderTree(child.id, depth + 1))}
    </div>
  }

  if (!data) return <div className="loading-screen"><div className="brand-mark"><Target /></div><p>Préparation de ton espace…</p></div>

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Target size={22} /></div><div><div className="brand-name">orbit<span>.</span></div><div className="brand-sub">PERSONAL GOALS</div></div></div>
        <div className="workspace-label">ESPACE PERSONNEL <MoreHorizontal size={16} /></div>
        <button className="nav-item active"><LayoutDashboard size={17} /> Tableau de bord</button>
        <button className="nav-item" onClick={() => setModal({ type: 'objective', parentId: null })}><FolderPlus size={17} /> Nouvel objectif <span className="shortcut">N</span></button>
        <div className="sidebar-section-head"><span>MES OBJECTIFS</span><button aria-label="Ajouter un objectif" onClick={() => setModal({ type: 'objective', parentId: null })}><Plus size={15} /></button></div>
        <div className="tree-list">
          {objectives.filter(o => !o.parentId).map(o => renderTree(o.id))}
          {!objectives.some(o => !o.parentId) && <p className="empty-small">Crée ton premier objectif.</p>}
        </div>
        <div className="sidebar-bottom">
          <div className="backup-card"><div className="backup-icon"><Sparkles size={17} /></div><div><strong>Tes données, ton espace.</strong><p>Les données restent dans ce navigateur.</p></div></div>
          <button className="nav-item" onClick={exportData}><Download size={16} /> Exporter mes données</button>
          <button className="nav-item" onClick={() => fileInput.current?.click()}><Upload size={16} /> Importer une sauvegarde</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={importData} />
          <div className="profile"><div className="avatar">O</div><div className="profile-copy"><strong>Mon espace</strong><span>Progression personnelle</span></div><Settings2 size={17} className="profile-settings" /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb"><span>Espace personnel</span><ChevronRight size={14} /><strong>Tableau de bord</strong></div><div className="top-actions"><div className="date-pill"><CalendarDays size={15} /> {new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}</div><button className="icon-button" title="Exporter les données" onClick={exportData}><Download size={17} /></button><div className="avatar avatar-small">O</div></div></header>
        <div className="content">
          <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> TON ESPACE DE PROGRESSION</div><h1>Chaque jour compte<span>.</span></h1><p className="welcome-sub">Transforme tes intentions en progrès mesurables.</p></div><button className="primary-button" onClick={() => setModal({ type: 'objective', parentId: null })}><Plus size={17} /> Nouvel objectif</button></section>

          <section className="stats-grid">
            <div className="stat-card"><div className="stat-top"><span>Progression globale</span><div className="stat-icon purple"><Target size={17} /></div></div><div className="stat-value">{allProgress}<small>%</small></div><div className="progress-track"><div className="progress-fill purple-fill" style={{ width: `${allProgress}%` }} /></div><div className="stat-foot"><span>Sur tes objectifs principaux</span><span className="trend"><TrendingUp size={13} /> En cours</span></div></div>
            <div className="stat-card"><div className="stat-top"><span>Temps aujourd’hui</span><div className="stat-icon blue"><Clock3 size={17} /></div></div><div className="stat-value">{fmtShort(todayMinutes)}</div><div className="stat-foot"><span>Sessions enregistrées aujourd’hui</span><span className="stat-foot-mark"><Activity size={13} /> Focus</span></div><div className="mini-bars">{[24,42,30,57,37,75,48,65,43,85,55,70].map((h,i)=><i key={i} style={{height:`${h}%`,opacity:.35+h/150}} />)}</div></div>
            <div className="stat-card"><div className="stat-top"><span>Cette semaine</span><div className="stat-icon green"><CalendarDays size={17} /></div></div><div className="stat-value">{fmtShort(weekMinutes)}</div><div className="stat-foot"><span>Sur les 7 derniers jours</span><span className="positive"><ArrowUpRight size={13} /> Temps cumulé</span></div><div className="stat-bottom-line"><span>Objectifs actifs</span><strong>{activeCount}</strong></div></div>
            <div className="stat-card"><div className="stat-top"><span>Objectifs terminés</span><div className="stat-icon orange"><CheckCircle2 size={17} /></div></div><div className="stat-value">{objectives.filter(o => o.done && !childrenOf(o.id).length).length}<small> / {objectives.length}</small></div><div className="stat-foot"><span>Objectifs sans sous-objectifs</span><span className="stat-foot-mark"><Check size={13} /> Accompli</span></div><div className="stat-bottom-line"><span>Continue sur ta lancée</span><ArrowUpRight size={15} className="muted-arrow" /></div></div>
          </section>

          <section className="main-grid">
            <div className="panel chart-panel">
              <div className="panel-heading"><div><div className="panel-kicker"><BarChart3 size={15} /> ANALYSE DU TEMPS</div><h2>Ton rythme de travail</h2><p className="panel-description">Temps cumulé par jour pour l’objectif sélectionné.</p></div><div className="period-switch">{[7,30,90].map(n=><button key={n} className={period===n?'chosen':''} onClick={()=>setPeriod(n)}>{n===7?'7 j':n===30?'30 j':'90 j'}</button>)}</div></div>
              {selected ? <><div className="chart-selected"><span className="selected-dot" style={{background:selected.color}} /><span>{selected.title}</span><span className="chart-total">{fmtMinutes(totalMinutes(selected.id))} au total</span></div>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{top:12,right:8,left:-18,bottom:2}}><defs><linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={selected.color} stopOpacity={0.25}/><stop offset="100%" stopColor={selected.color} stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#20283a" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="label" tick={{fill:'#78839b',fontSize:11}} tickLine={false} axisLine={false} minTickGap={28}/><YAxis tick={{fill:'#78839b',fontSize:11}} tickLine={false} axisLine={false} tickFormatter={v=>v>=60?`${Math.round(v/60)}h`:`${v}m`}/><Tooltip contentStyle={{background:'#151c2d',border:'1px solid #303a51',borderRadius:12,color:'#f4f6ff'}} labelStyle={{color:'#9ba7bf'}} formatter={v=>[fmtMinutes(v),'Temps travaillé']} labelFormatter={(label)=>`Date : ${label}`}/><Line type="monotone" dataKey="minutes" stroke={selected.color} strokeWidth={2.5} dot={false} activeDot={{r:5,fill:selected.color,stroke:'#111827',strokeWidth:2}}/></LineChart></ResponsiveContainer></div>
              <div className="chart-footer"><span><span className="legend-line" style={{background:selected.color}} /> Minutes de travail par jour</span><span className="chart-hint">Fais glisser le curseur pour explorer la période</span></div>
              <div className="brush-wrap"><ResponsiveContainer width="100%" height={44}><LineChart data={chartData} margin={{top:2,right:8,left:0,bottom:0}}><Line type="monotone" dataKey="minutes" stroke={selected.color} strokeWidth={1.5} dot={false}/><Brush dataKey="label" height={24} stroke="#6d62d9" travellerWidth={8} fill="#141a2a" /></LineChart></ResponsiveContainer></div>
              </> : <div className="empty-state"><Target size={28}/><h3>Aucun objectif pour le moment</h3><p>Crée un objectif pour commencer à suivre ton temps.</p><button className="primary-button" onClick={()=>setModal({type:'objective',parentId:null})}><Plus size={16}/> Créer un objectif</button></div>}
            </div>

            <div className="panel focus-panel"><div className="panel-heading compact"><div><div className="panel-kicker"><Target size={15}/> OBJECTIF SÉLECTIONNÉ</div><h2>Vue d’ensemble</h2></div>{selected && <button className="icon-button subtle" onClick={()=>setModal({type:'objective',parentId:selected.id})} title="Ajouter un sous-objectif"><Plus size={17}/></button>}</div>
              {selected ? <><div className="focus-title-row"><div className="focus-badge" style={{background:`${selected.color}20`,color:selected.color}}><Goal size={21}/></div><div className="focus-title"><h3>{selected.title}</h3><p>{selected.description || 'Aucune description pour le moment.'}</p></div></div><div className="focus-progress-label"><span>Progression</span><strong>{Math.round(completion(selected.id))}%</strong></div><div className="progress-track large"><div className="progress-fill" style={{width:`${completion(selected.id)}%`,background:selected.color}}/></div><div className="focus-metrics"><div><span>Temps cumulé</span><strong>{fmtMinutes(totalMinutes(selected.id))}</strong></div><div><span>Sous-objectifs</span><strong>{childrenOf(selected.id).length}</strong></div><div><span>Feuilles de travail</span><strong>{leafCount(selected.id)}</strong></div></div><div className="focus-actions"><button className="secondary-button" onClick={()=>setModal({type:'objective',parentId:selected.id})}><Plus size={15}/> Sous-objectif</button>{isLeaf(selected.id) ? <button className="primary-button" onClick={()=>setModal({type:'log'})}><Timer size={15}/> Ajouter du temps</button> : <span className="aggregate-note"><Activity size={14}/> Temps agrégé des enfants</span>}</div><div className="focus-bottom"><span>Créé le {fmtDate(selected.createdAt || todayISO())}</span><button className="text-danger" onClick={()=>deleteObjective(selected.id)}><Trash2 size={14}/> Supprimer</button></div></> : <div className="empty-state">Sélectionne ou crée un objectif.</div>}
            </div>
          </section>

          <section className="panel objectives-panel"><div className="panel-heading objectives-heading"><div><div className="panel-kicker"><Activity size={15}/> VUE D’ENSEMBLE</div><h2>Tes objectifs</h2><p className="panel-description">Organise tes étapes, suis leur progression et termine-les une par une.</p></div><div className="objective-controls"><div className="search-box"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…" /></div><button className="secondary-button" onClick={()=>setModal({type:'objective',parentId:selected?.id || null})}><Plus size={15}/> Ajouter</button></div></div>
            {objectives.length ? <div className="objective-table"><div className="table-head"><span>OBJECTIF</span><span>PROGRESSION</span><span>TEMPS CUMULÉ</span><span>STATUT</span><span>ACTION</span></div>
            {objectives.filter(o=>!o.parentId).filter(o=>!search || objectives.some(x=>x.title.toLowerCase().includes(search.toLowerCase()) && (x.id===o.id || isDescendant(objectives,x.id,o.id)))).map(root=>renderObjectiveRows(root,0))}
            </div> : <div className="empty-state"><Target size={28}/><h3>Ton espace est prêt</h3><p>Ajoute un objectif, puis décompose-le en étapes réalisables.</p><button className="primary-button" onClick={()=>setModal({type:'objective',parentId:null})}><Plus size={16}/> Créer un objectif</button></div>}
          </section>
          <footer className="footer"><span>ORBIT <span className="footer-dot">•</span> Construit pour avancer, un jour à la fois.</span><span><span className="save-dot"/> Sauvegarde locale activée</span></footer>
        </div>
      </main>

      {notice && <div className="toast"><CheckCircle2 size={17}/>{notice}</div>}
      {modal?.type==='objective' && <ObjectiveModal parent={objectives.find(o=>o.id===modal.parentId)} onClose={()=>setModal(null)} onSave={addObjective}/>}
      {modal?.type==='log' && selected && <LogModal objective={selected} onClose={()=>setModal(null)} onSave={addLog}/>}
    </div>
  )

  function renderObjectiveRows(obj, depth) {
    const children = childrenOf(obj.id)
    const pct = Math.round(completion(obj.id))
    const matching = !search || obj.title.toLowerCase().includes(search.toLowerCase())
    const childRows = children.map(child=>renderObjectiveRows(child,depth+1))
    if (search && !matching && !childRows.some(Boolean)) return null
    return <div key={obj.id}>
      <div className={`objective-row ${selectedId===obj.id?'row-selected':''}`} onClick={()=>setSelectedId(obj.id)} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&setSelectedId(obj.id)}>
        <div className="objective-name-cell" style={{paddingLeft:depth*23}}>
          <span className="table-color" style={{background:obj.color}}/>
          {children.length>0 ? <span className="table-folder"><ChevronDown size={13}/></span> : <span className="table-leaf"><Circle size={13}/></span>}
          <span className={`objective-title ${obj.done?'finished':''}`}>{obj.title}</span>
          {obj.done && <CheckCircle2 size={14} className="done-icon"/>}
        </div>
        <div className="progress-cell"><div className="progress-track"><div className="progress-fill" style={{width:`${pct}%`,background:obj.color}}/></div><span>{pct}%</span></div>
        <div className="time-cell">{fmtMinutes(totalMinutes(obj.id))}</div>
        <div><span className={`status-pill ${obj.done?'complete':children.length?'in-progress':'not-started'}`}><i/>{obj.done?'Terminé':pct>0?'En cours':'À faire'}</span></div>
        <div className="row-actions" onClick={e=>e.stopPropagation()}>{!children.length && <button title={obj.done?'Marquer comme à faire':'Terminer'} className={`complete-button ${obj.done?'completed':''}`} onClick={()=>toggleDone(obj.id)}>{obj.done?<Check size={14}/>:<CheckCircle2 size={14}/>}</button>}<button title="Ajouter un sous-objectif" className="row-icon-button" onClick={()=>setModal({type:'objective',parentId:obj.id})}><Plus size={15}/></button><button title="Supprimer" className="row-icon-button danger-hover" onClick={()=>deleteObjective(obj.id)}><Trash2 size={14}/></button></div>
      </div>
      {childRows}
    </div>
  }
}

function ObjectiveModal({ parent, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal-card" onSubmit={e=>{e.preventDefault();onSave({title,description,parentId:parent?.id||null})}}><div className="modal-head"><div><div className="panel-kicker"><Target size={14}/> NOUVELLE ÉTAPE</div><h2>{parent?'Ajouter un sous-objectif':'Créer un objectif'}</h2><p>{parent?`Cet objectif sera rattaché à « ${parent.title} ».`:'Définis un résultat que tu veux atteindre.'}</p></div><button type="button" className="icon-button" onClick={onClose}><X size={18}/></button></div><label className="field-label">Nom de l’objectif<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex. : Apprendre les bases de React" maxLength={100} required/></label><label className="field-label">Description <span>(facultatif)</span><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Pourquoi cet objectif est-il important ?" rows={3} maxLength={300}/></label><div className="modal-tip"><Sparkles size={16}/><span>Tu pourras ensuite décomposer cet objectif en étapes plus petites.</span></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Annuler</button><button type="submit" className="primary-button"><Plus size={16}/> Créer l’objectif</button></div></form></div>
}

function LogModal({ objective, onClose, onSave }) {
  const [date, setDate] = useState(todayISO())
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('30')
  const [note, setNote] = useState('')
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><form className="modal-card" onSubmit={e=>{e.preventDefault();onSave({date,hours,minutes,note})}}><div className="modal-head"><div><div className="panel-kicker"><Timer size={14}/> SESSION DE TRAVAIL</div><h2>Ajouter du temps</h2><p>Enregistre le temps réellement consacré à cette étape.</p></div><button type="button" className="icon-button" onClick={onClose}><X size={18}/></button></div><div className="log-target"><span className="selected-dot" style={{background:objective.color}}/><strong>{objective.title}</strong></div><label className="field-label">Date de la session<input type="date" value={date} max={todayISO()} onChange={e=>setDate(e.target.value)} required/></label><div className="field-label">Durée de travail<div className="duration-fields"><label><input type="number" min="0" max="24" value={hours} onChange={e=>setHours(e.target.value)} required/><span>heures</span></label><label><input type="number" min="0" max="59" value={minutes} onChange={e=>setMinutes(e.target.value)} required/><span>minutes</span></label></div></div><label className="field-label">Note de session <span>(facultatif)</span><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex. : Exercices sur les composants" maxLength={180}/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Annuler</button><button type="submit" className="primary-button"><Check size={16}/> Enregistrer la session</button></div></form></div>
}
export default App