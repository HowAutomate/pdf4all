import { useState } from 'react';
import { HeartPulse, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo-transparent.png';
import ThemeToggle from '@/components/ThemeToggle';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Unit = 'metric' | 'imperial';

interface BmiResult {
  bmi: number;
  category: string;
  color: string;
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

  let category: string;
  let color: string;
  if (bmi < 18.5) {
    category = 'Underweight';
    color = 'text-blue-500';
  } else if (bmi < 25) {
    category = 'Normal weight';
    color = 'text-emerald-500';
  } else if (bmi < 30) {
    category = 'Overweight';
    color = 'text-amber-500';
  } else {
    category = 'Obese';
    color = 'text-red-500';
  }

  return { bmi, category, color };
}

const BmiCalculator = () => {
  const [unit, setUnit] = useState<Unit>('metric');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [result, setResult] = useState<BmiResult | null>(null);

  const handleCalculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    setResult(calculateBmi(w, h, unit));
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logo} alt="HowAutomate" className="h-12 w-auto" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 flex-1">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Body Mass Index{' '}
              <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">Calculator</span>
            </h1>
            <p className="text-muted-foreground">Enter your height and weight to calculate your BMI.</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex gap-2">
                <Button
                  variant={unit === 'metric' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setUnit('metric'); handleReset(); }}
                >
                  Metric (kg/cm)
                </Button>
                <Button
                  variant={unit === 'imperial' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setUnit('imperial'); handleReset(); }}
                >
                  Imperial (lb/in)
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <div className="mt-6 p-6 rounded-xl bg-muted text-center animate-fade-in-up">
                  <p className="text-sm text-muted-foreground mb-1">Your BMI</p>
                  <p className="text-5xl font-bold text-foreground mb-2">{result.bmi}</p>
                  <p className={`text-lg font-semibold ${result.color}`}>{result.category}</p>
                  <div className="mt-4 grid grid-cols-4 gap-1 text-xs">
                    <div className="p-1.5 rounded bg-blue-500/10 text-blue-500">&lt;18.5 Under</div>
                    <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-500">18.5–24.9 Normal</div>
                    <div className="p-1.5 rounded bg-amber-500/10 text-amber-500">25–29.9 Over</div>
                    <div className="p-1.5 rounded bg-red-500/10 text-red-500">≥30 Obese</div>
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
