import { useState } from 'react';
import { ChevronDown, FileType } from 'lucide-react';
import { SUPPORTED_FORMATS } from '@/types/conversion';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function SupportedFormats() {
  const [isOpen, setIsOpen] = useState(false);

  const formatCategories = {
    Documents: ['.doc', '.docx', '.dot', '.dotx', '.odt', '.rtf', '.txt', '.wpd', '.pdf'],
    Spreadsheets: ['.csv', '.xls', '.xlsb', '.xlsx', '.xltx', '.ods', '.odc', '.numbers'],
    Presentations: ['.ppt', '.pptx', '.pps', '.ppsx', '.potx', '.odp', '.key', '.pages'],
    Images: ['.bmp', '.gif', '.heic', '.heif', '.ico', '.jfif', '.jpg', '.jpeg', '.png', '.psd', '.svg', '.tif', '.tiff', '.webp'],
    Other: ['.djvu', '.dwf', '.dwfx', '.dwg', '.dxf', '.eml', '.eps', '.epub', '.htm', '.html', '.log', '.md', '.mobi', '.msg', '.odf', '.odg', '.prn', '.ps', '.pub', '.vsd', '.vsdx'],
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger className="flex items-center justify-center gap-2 w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <FileType className="w-4 h-4" />
        <span>View all {SUPPORTED_FORMATS.length} supported formats</span>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>
      
      <CollapsibleContent className="animate-fade-in-up">
        <div className="p-6 mt-2 rounded-2xl bg-card border border-border">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(formatCategories).map(([category, formats]) => (
              <div key={category}>
                <h4 className="text-sm font-semibold text-foreground mb-2">{category}</h4>
                <div className="flex flex-wrap gap-1">
                  {formats.map((format) => (
                    <span
                      key={format}
                      className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
                    >
                      {format}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
