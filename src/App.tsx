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
const EditPdf = lazy(() => import("./pages/EditPdf"));
const ImageToKb = lazy(() => import("./pages/ImageToKb"));
const ImagesToPdf = lazy(() => import("./pages/ImagesToPdf"));
const ImageConverter = lazy(() => import("./pages/ImageConverter"));
const RemoveBackground = lazy(() => import("./pages/RemoveBackground"));
const PassportPhoto = lazy(() => import("./pages/PassportPhoto"));
const OrganizePdf = lazy(() => import("./pages/OrganizePdf"));
const PdfStamp = lazy(() => import("./pages/PdfStamp"));
const QrGenerator = lazy(() => import("./pages/QrGenerator"));
const CropImage = lazy(() => import("./pages/CropImage"));
const PdfToImages = lazy(() => import("./pages/PdfToImages"));
const SplitPdf = lazy(() => import("./pages/SplitPdf"));
const GstInvoiceGenerator = lazy(() => import("./pages/GstInvoiceGenerator"));
const GstCalculator = lazy(() => import("./pages/GstCalculator"));
const RentReceiptGenerator = lazy(() => import("./pages/RentReceiptGenerator"));
const SalarySlipGenerator = lazy(() => import("./pages/SalarySlipGenerator"));
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
            <Route path="/word-to-pdf" element={<Index />} />
            <Route path="/excel-to-pdf" element={<Index />} />
            <Route path="/ppt-to-pdf" element={<Index />} />
            <Route path="/jpg-to-pdf" element={<ImagesToPdf />} />
            <Route path="/png-to-pdf" element={<ImagesToPdf />} />
            <Route path="/pdf-to-jpg" element={<PdfToImages />} />
            <Route path="/pdf-to-png" element={<PdfToImages />} />
            <Route path="/bmi-calculator" element={<BmiCalculator />} />
            <Route path="/datetime-converter" element={<DateTimeConverter />} />
            <Route path="/ugc-content" element={<UgcContent />} />
            <Route path="/password-generator" element={<PasswordGenerator />} />
            <Route path="/word-counter" element={<WordCounter />} />
            <Route path="/json-to-typescript-zod" element={<JsonToTypescript />} />
            <Route path="/pdf-compressor" element={<PdfCompressor />} />
            <Route path="/compress-pdf-to-100kb" element={<PdfCompressor />} />
            <Route path="/compress-pdf-to-200kb" element={<PdfCompressor />} />
            <Route path="/compress-pdf-to-500kb" element={<PdfCompressor />} />
            <Route path="/compress-pdf-to-1mb" element={<PdfCompressor />} />
            <Route path="/merge-pdf" element={<MergePdf />} />
            <Route path="/edit-pdf" element={<EditPdf />} />
            <Route path="/photo-resizer-in-kb" element={<ImageToKb />} />
            <Route path="/resize-image-to-10kb" element={<ImageToKb />} />
            <Route path="/resize-image-to-20kb" element={<ImageToKb />} />
            <Route path="/resize-image-to-50kb" element={<ImageToKb />} />
            <Route path="/resize-image-to-100kb" element={<ImageToKb />} />
            <Route path="/resize-image-to-200kb" element={<ImageToKb />} />
            <Route path="/signature-resizer" element={<ImageToKb />} />
            <Route path="/ibps-photo-signature-size" element={<ImageToKb />} />
            <Route path="/neet-photo-size" element={<ImageToKb />} />
            <Route path="/jee-main-photo-size" element={<ImageToKb />} />
            <Route path="/ssc-signature-size" element={<ImageToKb />} />
            <Route path="/crop-image" element={<CropImage />} />
            <Route path="/remove-background" element={<RemoveBackground />} />
            <Route path="/passport-size-photo" element={<PassportPhoto />} />
            <Route path="/organize-pdf" element={<OrganizePdf />} />
            <Route path="/rotate-pdf" element={<OrganizePdf />} />
            <Route path="/delete-pdf-pages" element={<OrganizePdf />} />
            <Route path="/add-page-numbers" element={<PdfStamp />} />
            <Route path="/watermark-pdf" element={<PdfStamp />} />
            <Route path="/qr-code-generator" element={<QrGenerator />} />
            <Route path="/upi-qr-code-generator" element={<QrGenerator />} />
            <Route path="/whatsapp-qr-code-generator" element={<QrGenerator />} />
            <Route path="/compress-image" element={<ImageConverter />} />
            <Route path="/webp-to-jpg" element={<ImageConverter />} />
            <Route path="/png-to-jpg" element={<ImageConverter />} />
            <Route path="/jpg-to-png" element={<ImageConverter />} />
            <Route path="/jpg-to-webp" element={<ImageConverter />} />
            <Route path="/split-pdf" element={<SplitPdf />} />
            <Route path="/gst-invoice-generator" element={<GstInvoiceGenerator />} />
            <Route path="/quotation-generator" element={<GstInvoiceGenerator />} />
            <Route path="/proforma-invoice-generator" element={<GstInvoiceGenerator />} />
            <Route path="/delivery-challan-generator" element={<GstInvoiceGenerator />} />
            <Route path="/gst-calculator" element={<GstCalculator />} />
            <Route path="/rent-receipt-generator" element={<RentReceiptGenerator />} />
            <Route path="/salary-slip-generator" element={<SalarySlipGenerator />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
