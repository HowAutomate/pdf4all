import { useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo-transparent.png';
import ThemeToggle from '@/components/ThemeToggle';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type Unit = 'metric' | 'imperial';

interface BmiResult {
  bmi: number;
  category: string;
  color: string;
  bgColor: string;
}

function calculateBmi(weight: number, height: number, unit: Unit): BmiResult | null {
  if (weight <= 0 || height <= 0) return null;
  let bmi: number;
  if (unit === 'metric') {
    const heightM = height / 100;
    bmi = weight / (heightM * heightM);
  } else {
    bmi = (703 * weight) / (height * height);
  }
  bmi = Math.round(bmi * 10) / 10;
  if (bmi < 18.5) return { bmi, category: 'Underweight', color: 'text-blue-500', bgColor: 'bg-blue-500/10' };
  if (bmi < 25)   return { bmi, category: 'Normal weight', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' };
  if (bmi < 30)   return { bmi, category: 'Overweight', color: 'text-amber-500', bgColor: 'bg-amber-500/10' };
  return { bmi, category: 'Obese', color: 'text-red-500', bgColor: 'bg-red-500/10' };
}

function getGaugePercent(bmi: number): number {
  return Math.min(100, Math.max(0, ((bmi - 15) / (40 - 15)) * 100));
}

const BmiCalculator = () => {
  const [unit, setUnit] = useState<Unit>('metric');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [result, setResult] = useState<BmiResult | null>(null);

  const handleCalculate = () => {
    setResult(calculateBmi(parseFloat(weight), parseFloat(height), unit));
  };

  const handleReset = () => {
    setWeight('');
    setHeight('');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="BMI Calculator - HowAutomate Tools"
        description="Free Body Mass Index (BMI) calculator. Get instant health insights from your height and weight in metric or imperial units."
        path="/bmi-calculator"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'BMI Calculator',
          url: 'https://tools.howautomate.com/bmi-calculator',
          applicationCategory: 'HealthApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }}
      />
      <header style={{ position:'sticky', top:0, zIndex:20, background:'rgba(7,4,15,0.92)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 40px', height:80, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link to="/" style={{ display:'flex', alignItems:'center', textDecoration:'none', opacity:1, transition:'opacity 0.15s' }}
            onMouseEnter={e=>(e.currentTarget.style.opacity='0.82')}
            onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
            <img src={logo} alt="HowAutomate" style={{ height:56, width:'auto', display:'block' }} />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Tool hero */}
      <div style={{ position:'relative', overflow:'hidden', background:'#07040f', padding:'72px 32px 64px', textAlign:'center' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)', width:600, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(219,39,119,0.2) 0%, transparent 65%)' }}/>
          <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)', backgroundSize:'52px 52px' }}/>
        </div>
        <div style={{ position:'relative', maxWidth:600, margin:'0 auto' }}>
          <div style={{ display:'inline-flex', padding:14, borderRadius:18, background:'linear-gradient(135deg,#db2777,#e11d48)', boxShadow:'0 8px 28px rgba(219,39,119,0.45)', marginBottom:20 }}>
            <HeartPulse style={{ width:30, height:30, color:'#fff' }} />
          </div>
          <h1 style={{ fontSize:'clamp(2rem,4vw,2.8rem)', fontWeight:900, color:'#fff', margin:'0 0 14px', letterSpacing:'-0.03em' }}>BMI Calculator</h1>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.48)', lineHeight:1.7, margin:0 }}>
            Enter your height and weight to instantly calculate your Body Mass Index.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-10 flex-1">
        <div className="max-w-md mx-auto">
          <Card className="shadow-lg">
            <CardHeader className="pb-0">
              <div className="flex gap-2">
                <Button
                  variant={unit === 'metric' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setUnit('metric'); handleReset(); }}
                >
                  Metric (kg / cm)
                </Button>
                <Button
                  variant={unit === 'imperial' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setUnit('imperial'); handleReset(); }}
                >
                  Imperial (lb / in)
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <Label htmlFor="weight">Weight ({unit === 'metric' ? 'kg' : 'lb'})</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder={unit === 'metric' ? 'e.g. 70' : 'e.g. 154'}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="height">Height ({unit === 'metric' ? 'cm' : 'inches'})</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder={unit === 'metric' ? 'e.g. 175' : 'e.g. 69'}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
              <Button onClick={handleCalculate} className="w-full" disabled={!weight || !height}>
                Calculate BMI
              </Button>

              {result && (
                <div className="mt-2 animate-in fade-in duration-300">
                  {/* Big result */}
                  <div className={'p-6 rounded-2xl text-center mb-4 ' + result.bgColor}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">Your BMI</p>
                    <p className="text-6xl font-extrabold text-foreground leading-none mb-2">{result.bmi}</p>
                    <p className={'text-lg font-bold ' + result.color}>{result.category}</p>
                  </div>

                  {/* Visual gauge */}
                  <div className="px-1 mb-4">
                    <div className="relative h-3 rounded-full bg-gradient-to-r from-blue-400 via-emerald-400 via-amber-400 to-red-500 mb-1">
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-foreground shadow-md transition-all duration-500"
                        style={{ left: 'calc(' + getGaugePercent(result.bmi) + '% - 8px)' }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                      <span>15</span>
                      <span>Underweight</span>
                      <span>Normal</span>
                      <span>Overweight</span>
                      <span>Obese 40+</span>
                    </div>
                  </div>

                  {/* Scale reference */}
                  <div className="grid grid-cols-4 gap-1 text-xs">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 text-center font-medium">&lt;18.5<br/>Under</div>
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-center font-medium">18.5–24.9<br/>Normal</div>
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 text-center font-medium">25–29.9<br/>Over</div>
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-500 text-center font-medium">&ge;30<br/>Obese</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Free online tools by{' '}
          <a href="https://howautomate.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            HowAutomate
          </a>
        </div>
      </footer>
    </div>
  );
};

export default BmiCalculator;
