'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import FilmGrain from '@/components/FilmGrain'
import FrootChoose from '@/components/froot/FrootChoose'
import MeasurementStep from '@/components/froot/MeasurementStep'
import ShapeQuestions from '@/components/froot/ShapeQuestions'
import GoalStep from '@/components/froot/GoalStep'
import FrootResults from '@/components/froot/FrootResults'
import FrootProgress from '@/components/froot/FrootProgress'
import CurrentBraStep from '@/components/froot/CurrentBraStep'
import BandFitStep from '@/components/froot/BandFitStep'
import CupFitStep from '@/components/froot/CupFitStep'
import IssuesStep from '@/components/froot/IssuesStep'
import SizeConverter from '@/components/froot/SizeConverter'
import { FrootProfileProvider } from '@/components/froot/FrootProfileContext'
import { calculateSize, calculateFromFitCheck } from '@/components/froot/sizing'
import type { Measurements, ShapeProfile, SizeResult, BandFit, CupFit, FitCheckInput, AestheticGoal } from '@/components/froot/sizing'
import brandMeasurementsJson from '@/data/brand-measurements.json'

const brandData = brandMeasurementsJson as Record<string, Record<string, Record<string, number>>>

const MEASUREMENT_STEPS = [
  {
    key: 'looseUnderbust' as const,
    title: 'Loose Underbust',
    instruction: 'This one\u2019s easy. Wrap the tape around your ribcage just below your bust, keep it level, and let it rest \u2014 no pulling. You should be able to slide a finger underneath.',
  },
  {
    key: 'snugUnderbust' as const,
    title: 'Snug Underbust',
    instruction: 'Same spot. This time pull snug \u2014 like how a good band should feel. Firm but you can still breathe comfortably.',
  },
  {
    key: 'tightUnderbust' as const,
    title: 'Tight Underbust',
    instruction: 'Now pull the tape as tight as you can. Yes, really \u2014 exhale fully and squeeze. This tells us how much your ribcage compresses.',
  },
  {
    key: 'standingBust' as const,
    title: 'Standing Bust',
    instruction: 'Stand up straight. Wrap the tape around the fullest part of your bust, keeping it level. Don\u2019t compress \u2014 just let it rest.',
  },
  {
    key: 'leaningBust' as const,
    title: 'Leaning Bust',
    instruction: 'Bend forward 90\u00b0 so your back is flat. Let gravity do its thing. Wrap the tape around the fullest point \u2014 this is usually the most telling measurement.',
  },
  {
    key: 'lyingBust' as const,
    title: 'Lying Bust',
    instruction: 'Last one! Lie on your back and measure around the fullest point. Everything sits differently here \u2014 that\u2019s exactly why we need it.',
  },
]

// Measure: 6 measurements + shape + goal + results = 9 steps
// Fitcheck: current bra + band + cup + issues + shape + goal + results = 7 steps
const MEASURE_TOTAL = 9
const FITCHECK_TOTAL = 7

const variants = {
  enter: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? 40 : -40,
  }),
  center: { opacity: 1, y: 0 },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction > 0 ? -25 : 25,
  }),
}

type Mode = 'choose' | 'measure' | 'fitcheck' | 'convert'

export default function FrootPage() {
  const [mode, setMode] = useState<Mode>('choose')
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [unit, setUnit] = useState<'in' | 'cm'>('in')

  const [measurements, setMeasurements] = useState<Partial<Measurements>>({})
  const [shapeProfile, setShapeProfile] = useState<ShapeProfile | null>(null)
  const [aestheticGoal, setAestheticGoal] = useState<AestheticGoal | null>(null)
  const [result, setResult] = useState<SizeResult | null>(null)

  const [fcBrand, setFcBrand] = useState('')
  const [fcSize, setFcSize] = useState('')
  const [fcBandFit, setFcBandFit] = useState<BandFit | null>(null)
  const [fcCupFit, setFcCupFit] = useState<CupFit | null>(null)
  const [fcIssues, setFcIssues] = useState<string[]>([])
  const [fitCheckData, setFitCheckData] = useState<FitCheckInput | null>(null)

  const brandList = useMemo(() => Object.keys(brandData), [])

  // Results step: measure=9, fitcheck=7
  const isResults = (mode === 'measure' && step === 9) || (mode === 'fitcheck' && step === 7) || mode === 'convert'
  const totalSteps = mode === 'fitcheck' ? FITCHECK_TOTAL : MEASURE_TOTAL

  useEffect(() => {
    document.body.style.overflow = 'auto'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Restore results from URL hash (shareable links)
  useEffect(() => {
    try {
      const hash = window.location.hash.slice(1)
      if (!hash) return
      const data = JSON.parse(decodeURIComponent(atob(hash)))
      if (data.r && data.s && data.g) {
        setResult(data.r)
        setShapeProfile(data.s)
        setAestheticGoal(data.g)
        if (data.m) { setMeasurements(data.m); setUnit(data.m.unit || 'in') }
        if (data.fc) setFitCheckData(data.fc)
        setMode(data.fc ? 'fitcheck' : 'measure')
        setStep(data.fc ? 7 : 9)
        setDirection(1)
      }
    } catch { /* invalid hash, ignore */ }
  }, [])

  // Update URL hash when results are shown
  useEffect(() => {
    if (!isResults || !result || !shapeProfile || !aestheticGoal) return
    try {
      const data: Record<string, unknown> = { r: result, s: shapeProfile, g: aestheticGoal }
      if (Object.keys(measurements).length > 0) data.m = measurements
      if (fitCheckData) data.fc = {
        currentBrand: fitCheckData.currentBrand,
        currentSize: fitCheckData.currentSize,
        bandFit: fitCheckData.bandFit,
        cupFit: fitCheckData.cupFit,
        issues: fitCheckData.issues,
      }
      const hash = btoa(encodeURIComponent(JSON.stringify(data)))
      window.history.replaceState(null, '', `#${hash}`)
    } catch { /* encoding failed, no big deal */ }
  }, [isResults, result, shapeProfile, aestheticGoal, measurements, fitCheckData])

  function goForward(nextStep: number) {
    setDirection(1)
    setStep(nextStep)
  }

  function goBack() {
    if (step <= 0) return
    if (step === 1 && mode !== 'choose') {
      setMode('choose')
      setStep(0)
      setDirection(-1)
      return
    }
    setDirection(-1)
    setStep(step - 1)
  }

  function handleMeasurement(key: string, value: number) {
    setMeasurements((prev) => ({ ...prev, [key]: value }))
    goForward(step + 1)
  }

  // Shape → advance to goal step (not results)
  function handleShape(shape: ShapeProfile) {
    setShapeProfile(shape)
    if (mode === 'measure') {
      // Calculate size now, show goal step next
      const fullMeasurements: Measurements = {
        looseUnderbust: measurements.looseUnderbust!,
        snugUnderbust: measurements.snugUnderbust!,
        tightUnderbust: measurements.tightUnderbust!,
        standingBust: measurements.standingBust!,
        leaningBust: measurements.leaningBust!,
        lyingBust: measurements.lyingBust!,
        unit,
      }
      setResult(calculateSize(fullMeasurements, shape))
      goForward(8) // → GoalStep
    } else {
      const input: FitCheckInput = {
        currentBrand: fcBrand,
        currentSize: fcSize,
        bandFit: fcBandFit!,
        cupFit: fcCupFit!,
        issues: fcIssues,
        shape,
      }
      setFitCheckData(input)
      setResult(calculateFromFitCheck(input, brandData))
      goForward(6) // → GoalStep
    }
  }

  // Goal → advance to results
  function handleGoal(goal: AestheticGoal) {
    setAestheticGoal(goal)
    if (mode === 'measure') {
      goForward(9) // → Results
    } else {
      goForward(7) // → Results
    }
  }

  function handleDemo() {
    const demoMeasurements: Measurements = {
      looseUnderbust: 32,
      snugUnderbust: 31,
      tightUnderbust: 29,
      standingBust: 37,
      leaningBust: 39,
      lyingBust: 37,
      unit: 'in',
    }
    const demoShape: ShapeProfile = {
      projection: 'projected',
      fullness: 'full-on-top',
      rootWidth: 'narrow',
    }
    setMode('measure')
    setUnit('in')
    setMeasurements(demoMeasurements)
    setShapeProfile(demoShape)
    setAestheticGoal('lifted')
    setResult(calculateSize(demoMeasurements, demoShape))
    goForward(9)
  }

  function handleStartOver() {
    setMode('choose')
    setStep(0)
    setDirection(-1)
    setMeasurements({})
    setShapeProfile(null)
    setAestheticGoal(null)
    setResult(null)
    setFcBrand('')
    setFcSize('')
    setFcBandFit(null)
    setFcCupFit(null)
    setFcIssues([])
    setFitCheckData(null)
  }

  function renderStep() {
    if (mode === 'choose' && step === 0) {
      return (
        <FrootChoose
          unit={unit}
          onUnitChange={setUnit}
          onMeasure={() => { setMode('measure'); goForward(1) }}
          onFitCheck={() => { setMode('fitcheck'); goForward(1) }}
          onConvert={() => { setMode('convert'); setStep(1) }}
          onDemo={handleDemo}
        />
      )
    }

    if (mode === 'measure') {
      // Steps 1-6: measurements
      if (step >= 1 && step <= 6) {
        const ms = MEASUREMENT_STEPS[step - 1]
        return (
          <MeasurementStep
            key={ms.key}
            stepNumber={step}
            stepKey={ms.key}
            title={ms.title}
            instruction={ms.instruction}
            unit={unit}
            value={measurements[ms.key] ?? null}
            onNext={(val) => handleMeasurement(ms.key, val)}
          />
        )
      }

      // Step 7: shape questions
      if (step === 7) {
        return <ShapeQuestions onNext={handleShape} />
      }

      // Step 8: aesthetic goal
      if (step === 8) {
        return <GoalStep onNext={handleGoal} />
      }

      // Step 9: results
      if (step === 9 && result && shapeProfile) {
        const fullMeasurements: Measurements = {
          looseUnderbust: measurements.looseUnderbust!,
          snugUnderbust: measurements.snugUnderbust!,
          tightUnderbust: measurements.tightUnderbust!,
          standingBust: measurements.standingBust!,
          leaningBust: measurements.leaningBust!,
          lyingBust: measurements.lyingBust!,
          unit,
        }
        return (
          <FrootResults
            result={result}
            measurements={fullMeasurements}
            shapeProfile={shapeProfile}
            aestheticGoal={aestheticGoal || 'natural'}
            onStartOver={handleStartOver}
          />
        )
      }
    }

    if (mode === 'convert') {
      return (
        <SizeConverter
          brands={brandList}
          onStartOver={handleStartOver}
        />
      )
    }

    if (mode === 'fitcheck') {
      if (step === 1) {
        return (
          <CurrentBraStep
            brands={brandList}
            onNext={(brand, size) => {
              setFcBrand(brand)
              setFcSize(size)
              goForward(2)
            }}
          />
        )
      }

      if (step === 2) {
        return (
          <BandFitStep onNext={(fit) => {
            setFcBandFit(fit)
            goForward(3)
          }} />
        )
      }

      if (step === 3) {
        return (
          <CupFitStep onNext={(fit) => {
            setFcCupFit(fit)
            goForward(4)
          }} />
        )
      }

      if (step === 4) {
        return (
          <IssuesStep onNext={(issues) => {
            setFcIssues(issues)
            goForward(5)
          }} />
        )
      }

      if (step === 5) {
        return <ShapeQuestions onNext={handleShape} />
      }

      // Step 6: aesthetic goal
      if (step === 6) {
        return <GoalStep onNext={handleGoal} />
      }

      // Step 7: results
      if (step === 7 && result && shapeProfile) {
        return (
          <FrootResults
            result={result}
            shapeProfile={shapeProfile}
            aestheticGoal={aestheticGoal || 'natural'}
            onStartOver={handleStartOver}
            fitCheckData={fitCheckData ? {
              currentBrand: fitCheckData.currentBrand,
              currentSize: fitCheckData.currentSize,
              bandFit: fitCheckData.bandFit,
              cupFit: fitCheckData.cupFit,
              issues: fitCheckData.issues,
            } : undefined}
          />
        )
      }
    }

    return null
  }

  const showNav = (mode !== 'choose' && !isResults) || mode === 'convert'
  const showProgress = showNav && step > 0 && mode !== 'convert'

  return (
    <FrootProfileProvider>
    <main style={{
      position: 'relative',
      width: '100vw',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FAF6EE 0%, #F7F1E6 40%, #FAF6EE 100%)',
    }}>
      <FilmGrain />

      {/* Top nav */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '22px 28px',
        zIndex: 20,
        fontFamily: 'var(--font-space-mono), monospace',
      }}>
        {showNav ? (
          <motion.button
            whileHover={{ x: -3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={goBack}
            style={{
              fontSize: '9px',
              letterSpacing: '0.15em',
              color: 'rgba(26,8,8,0.3)',
              textTransform: 'uppercase',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: 0,
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.6)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(26,8,8,0.3)'}
          >
            &larr; back
          </motion.button>
        ) : (
          <Link href="/" style={{
            fontSize: '9px',
            letterSpacing: '0.22em',
            color: 'rgba(26,8,8,0.3)',
            textTransform: 'uppercase',
          }}>
            &larr; ninas.ai
          </Link>
        )}

        {showProgress ? (
          <FrootProgress current={step} total={totalSteps} />
        ) : (
          <span style={{
            fontSize: '9px',
            letterSpacing: '0.15em',
            color: 'rgba(26,8,8,0.2)',
            textTransform: 'uppercase',
          }}>
            {mode === 'choose' ? 'froot' : ''}
          </span>
        )}
      </nav>

      {/* Step content with transitions */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`${mode}-${step}`}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </main>
    </FrootProfileProvider>
  )
}
