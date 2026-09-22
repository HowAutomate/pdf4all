import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";

// Tool pages are code-split so the landing page ships only what it needs —
// heavy deps (pdf-lib, jszip) load on demand when a tool is opened.
const Index = lazy(() => import("./pages/Index"));
const BmiCalculator = lazy(() => import("./pages/BmiCalculator"));
const DateTimeConverter = lazy(() => import("./pages/DateTimeConverter"));
const UgcContent = lazy(() => import("./pages/UgcContent"));
const PasswordGenerator = lazy(() => import("./pages/PasswordGenerator"));
const WordCounter = lazy(() => import("./pages/WordCounter"));
const JsonToTypescript = lazy(() => import("./pages/JsonToTypescript"));
const PdfCompressor = lazy(() => import("./pages/PdfCompressor"));
const MergePdf = lazy(() => import("./pages/MergePdf"));
const SplitPdf = lazy(() => import("./pages/SplitPdf"));
const GstInvoiceGenerator = lazy(() => import("./pages/GstInvoiceGenerator"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div style={{ minHeight: "100vh", background: "#07040f" }} />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pdf-converter" element={<Index />} />
            <Route path="/bmi-calculator" element={<BmiCalculator />} />
            <Route path="/datetime-converter" element={<DateTimeConverter />} />
            <Route path="/ugc-content" element={<UgcContent />} />
            <Route path="/password-generator" element={<PasswordGenerator />} />
            <Route path="/word-counter" element={<WordCounter />} />
            <Route path="/json-to-typescript-zod" element={<JsonToTypescript />} />
            <Route path="/pdf-compressor" element={<PdfCompressor />} />
            <Route path="/merge-pdf" element={<MergePdf />} />
            <Route path="/split-pdf" element={<SplitPdf />} />
            <Route path="/gst-invoice-generator" element={<GstInvoiceGenerator />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
