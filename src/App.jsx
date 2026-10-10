import React from 'react'
import { getDb } from './db.js'
import { LEVELS } from './levels.js'
import { VARIANTS } from './variants.js'
import { LESSONS } from './lessons.js'
import {
  loadProgress,
  saveProgress,
  resetProgress,
  rankOf,
  ADVANCED_COST,
  newCode,
  markWrong,
  advanceWrong,
  pendingItems,
  dueItems,
  markLessonDone,
  lessonsDone
} from './progress.js'
import { Toast, TopBar } from './ui.jsx'
import { Intro, LevelMap, Sandbox, Dictionary } from './pages.jsx'
import LevelPlay from './LevelPlay.jsx'
import Tutorial from './Tutorial.jsx'
import Review from './Review.jsx'
import Lessons from './Lessons.jsx'
import Profile from './Profile.jsx'

const REVIEW_BONUS = 15
const REVIEW_BATCH = 3

function unlockedSet(progress) {
  const done = Object.keys(progress.stars).map(Number)
  const maxDone = done.length ? Math.max(...done) : 0
  const s = new Set([1])
  for (let i = 1; i <= maxDone + 1; i++) s.add(i)
  if (progress.path === 'work') {
    s.add(14)
    s.add(18)
  }
  return s
}

export default function App() {
  const [db, setDb] = React.useState(null)
  const [dbErr, setDbErr] = React.useState(null)
  const [progress, setProgress] = React.useState(() => loadProgress())
  const [route, setRoute] = React.useState({ page: 'intro' })
  const [toastText, setToastText] = React.useState('')
  const timer = React.useRef(null)

  // 需要数据库的页面（其余页面不等它，首屏可以立刻出现）
  const NEEDS_DB = { level: 1, lessons: 1, review: 1, sandbox: 1, dict: 1, tutorial: 1 }
  const needDb = !!NEEDS_DB[route.page]

  /**
   * 数据库（SQLite 引擎 643KB + 练习数据 777KB）按需加载：
   *  - 首页/地图不需要它 → 立刻渲染，不再白屏
   *  - 进入需要的页面时优先加载；停留首页时在空闲后后台预热，
   *    这样等用户点进关卡，数据通常已经准备好了
   */
  React.useEffect(() => {
    if (db || dbErr) return
    let cancelled = false
    const load = () =>
      getDb()
        .then((d) => !cancelled && setDb(d))
        .catch((e) => !cancelled && setDbErr(String(e?.message || e)))
    // 需要的页面立刻加载；不需要的页面等 400ms 再后台预热
    const id = setTimeout(load, needDb ? 0 : 400)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [needDb, db, dbErr])

  React.useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const toast = (t) => {
    setToastText(t)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToastText(''), 2200)
  }

  if (dbErr) return <div className="loading">数据加载失败：{dbErr}</div>

  const rankInfo = rankOf(progress)
  const unlocked = unlockedSet(progress)
  const level = route.page === 'level' ? LEVELS.find((l) => l.id === route.id) : null

  // 复盘队列：到期的排前面，没到期的也可以提前做
  const due = dueItems(progress)
  const queue = [...due, ...pendingItems(progress).filter((w) => !due.some((d) => d.levelId === w.levelId))]
    .slice(0, REVIEW_BATCH)
    .map((w) => ({
      levelId: w.levelId,
      level: LEVELS.find((l) => l.id === w.levelId),
      variant: VARIANTS[w.levelId],
      due: w.dueAt <= Date.now()
    }))
    .filter((x) => x.level && x.variant)

  const pickPath = (path) => {
    setProgress((p) => ({ ...p, path }))
    if (path === 'basic' && !progress.tutorialDone) {
      setRoute({ page: 'tutorial', then: 'map' })
      return
    }
    if (path === 'work') toast('已解锁业务线，卡住了随时回基础线补')
    setRoute({ page: 'map' })
  }

  const finishLevel = (lv, stars, bonus) => {
    setProgress((p) => {
      // 自己重新做对也算往前走一档，不必非等到复盘
      const next = advanceWrong(p, lv.id)
      return {
        ...next,
        stars: { ...next.stars, [lv.id]: Math.max(next.stars[lv.id] || 0, stars) },
        bonus: next.bonus + bonus
      }
    })
  }

  const logWrong = (levelId) => setProgress((p) => markWrong(p, levelId))

  const passReviewItem = (item) => {
    setProgress((p) => {
      const next = advanceWrong(p, item.levelId)
      return { ...next, bonus: next.bonus + REVIEW_BONUS }
    })
  }

  const unlockAdvanced = (how, code) => {
    if (how === 'bonus' && progress.bonus < ADVANCED_COST) return
    setProgress((p) => ({
      ...p,
      bonus: how === 'bonus' ? p.bonus - ADVANCED_COST : p.bonus,
      advancedUnlocked: true,
      advancedCode: newCode()
    }))
    toast('进阶章节内测资格已解锁')
  }

  const goNextLevel = () => {
    const next = LEVELS.find((l) => l.id === (route.id || 0) + 1)
    if (next) setRoute({ page: 'level', id: next.id })
    else setRoute({ page: 'map' })
  }

  const endTutorial = (completed) => {
    setProgress((p) => ({ ...p, tutorialDone: true, path: p.path || 'basic' }))
    if (route.then === 'level') {
      setRoute({ page: 'level', id: route.backId })
      return
    }
    if (route.then === 'intro' && completed) {
      // 界面走完，接着上「零基础第一课」，从最基础的 SQL 概念开始
      setRoute({ page: 'lessons', start: 1 })
      toast('界面认完了，接着从最基础的概念开始')
      return
    }
    if (route.then === 'lessons') {
      setRoute({ page: 'lessons', start: route.backId || 1 })
      return
    }
    setRoute({ page: route.then === 'intro' ? 'intro' : 'map' })
  }

  return (
    <div>
      <TopBar
        rankInfo={rankInfo}
        progress={progress}
        route={route}
        onNav={setRoute}
        dueCount={due.length}
        wrongCount={pendingItems(progress).length}
        lessonsCount={lessonsDone(progress)}
        onReview={() => (queue.length ? setRoute({ page: 'review' }) : toast('现在没有要复盘的题，先去闯关吧'))}
        onLessons={() => setRoute({ page: 'lessons', start: 1 })}
        onProfile={() => setRoute({ page: 'profile' })}
        onReset={() => {
          if (confirm('确定清空所有进度，从第一天重新入职吗？')) {
            setProgress(resetProgress())
            setRoute({ page: 'intro' })
            toast('进度已清空')
          }
        }}
      />

      {route.page === 'intro' && (
        <Intro
          onPick={pickPath}
          onTutorial={() => setRoute({ page: 'tutorial', then: 'intro' })}
          onLessons={() => setRoute({ page: 'lessons', start: 1 })}
          hasProgress={Object.keys(progress.stars).length > 0}
          tutorialDone={progress.tutorialDone}
        />
      )}

      {route.page === 'tutorial' && (
        <Tutorial db={db} onDone={() => endTutorial(true)} onSkip={() => endTutorial(false)} />
      )}

      {route.page === 'map' && (
        <LevelMap
          progress={progress}
          unlocked={unlocked}
          onOpen={(id) => setRoute({ page: 'level', id })}
          onUnlockAdvanced={unlockAdvanced}
          onReview={() => (queue.length ? setRoute({ page: 'review' }) : toast('现在没有要复盘的题，先去闯关吧'))}
          toast={toast}
        />
      )}

      {route.page === 'level' && level && (
        <LevelPlay
          db={db}
          level={level}
          progress={progress}
          onFinish={finishLevel}
          onWrong={logWrong}
          onBack={(arg) => (arg === 'next' ? goNextLevel() : setRoute({ page: 'map' }))}
          onTutorial={() => setRoute({ page: 'tutorial', then: 'level', backId: route.id })}
          toast={toast}
        />
      )}

      {route.page === 'review' && (
        <Review
          db={db}
          queue={queue}
          onPass={passReviewItem}
          onExit={() => setRoute({ page: 'map' })}
          onFinish={() => {
            setRoute({ page: 'map' })
            toast('复盘完成，待改进项往前走了一档')
          }}
        />
      )}

      {route.page === 'lessons' && (
        <Lessons
          db={db}
          lessons={LESSONS}
          startId={route.start || 1}
          progress={progress}
          onDoneLesson={(l) => setProgress((p) => markLessonDone(p, l.id))}
          onExit={() => setRoute({ page: 'map' })}
          onAllDone={() => {
            setRoute({ page: 'map' })
            toast('第一课 14 节全部完成，去闯关吧')
          }}
        />
      )}

      {route.page === 'sandbox' && <Sandbox db={db} />}
      {route.page === 'dict' && <Dictionary db={db} />}

      {route.page === 'profile' && (
        <Profile
          progress={progress}
          onReview={() => (queue.length ? setRoute({ page: 'review' }) : toast('现在没有要复盘的题'))}
          onLessons={() => setRoute({ page: 'lessons', start: 1 })}
          toast={toast}
        />
      )}

      {needDb && !db && (
        <div className="db-strip" data-testid="db-loading">
          <span className="spin" />
          正在准备数据库（首次需要下载引擎和练习数据，约 1.4MB）…页面已经可以先看，准备好就能执行
        </div>
      )}

      <Toast text={toastText} />
    </div>
  )
}
