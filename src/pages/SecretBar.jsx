import React, { useState } from "react";
import { Download, FileText, Database, Code2, Plug, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { buildZip } from "@/lib/zipBuilder";
import { loadSourceFiles } from "@/lib/sourceFiles";
import { generatePdf } from "@/lib/pdfBuilder";
import { backendDoc, databaseDoc, integrationsDoc } from "@/lib/docsContent";

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function SecretBar() {
  const [busy, setBusy] = useState("");

  const doZip = async () => {
    setBusy("zip");
    try {
      const files = await loadSourceFiles();
      if (files.length === 0) {
        toast({ title: "Sem ficheiros", description: "Não foi possível carregar o código.", variant: "destructive" });
        return;
      }
      const blob = buildZip(files);
      download(blob, "sonora-source.zip");
      toast({ title: "ZIP gerado", description: `${files.length} ficheiros` });
    } catch {
      toast({ title: "Erro ao gerar ZIP", variant: "destructive" });
    }
    setBusy("");
  };

  const doPdf = async (doc, filename, label) => {
    setBusy(filename);
    try {
      const blob = generatePdf(doc.title, doc.sections);
      download(blob, filename);
      toast({ title: `${label} gerado` });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
    setBusy("");
  };

  const cards = [
    { icon: Code2, title: "Código fonte (ZIP)", desc: "Todos os ficheiros de src/, base44/, public/ e root (configs).", action: doZip, busyKey: "zip", file: "sonora-source.zip", color: "from-pink-500 to-rose-500" },
    { icon: FileText, title: "Doc. Backend (PDF)", desc: "Implementação, lógica, PlayerContext, amigos, auth, PWA.", action: () => doPdf(backendDoc, "sonora-backend.pdf", "Backend"), busyKey: "sonora-backend.pdf", file: "sonora-backend.pdf", color: "from-fuchsia-500 to-purple-600" },
    { icon: Database, title: "Doc. Base de Dados (PDF)", desc: "Schema de todas as entidades, RLS, relacionamentos, populate.", action: () => doPdf(databaseDoc, "sonora-database.pdf", "Base de dados"), busyKey: "sonora-database.pdf", file: "sonora-database.pdf", color: "from-cyan-500 to-blue-500" },
    { icon: Plug, title: "Doc. Integrações (PDF)", desc: "Integrações Core, APIs externas, OAuth connectors.", action: () => doPdf(integrationsDoc, "sonora-integrations.pdf", "Integrações"), busyKey: "sonora-integrations.pdf", file: "sonora-integrations.pdf", color: "from-emerald-500 to-green-600" },
  ];

  return (
    <div className="pb-10">
      <div className="px-6 md:px-10 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <ShieldOff className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl md:text-5xl font-bold">Barra Secret</h1>
            <p className="text-sm text-muted-foreground mt-2">Ferramentas de exportação e documentação do projeto.</p>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const isBusy = busy === c.busyKey;
          return (
            <div key={c.title} className="rounded-2xl bg-card border border-border p-5 flex flex-col">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center mb-3`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-bold">{c.title}</h2>
              <p className="text-sm text-muted-foreground mt-1 flex-1">{c.desc}</p>
              <Button onClick={c.action} disabled={!!busy} className="mt-4 am-gradient rounded-full w-full">
                <Download className="w-4 h-4 mr-2" />
                {isBusy ? "A gerar..." : "Descarregar"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}