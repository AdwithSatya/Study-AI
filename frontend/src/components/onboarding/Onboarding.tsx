import { useState, useRef, useEffect } from "react";
import {
  listFolders, createFolder,
  listFiles, uploadFile,
  type Folder, type FileItem
} from "../../api";
import { useAppState, useAppDispatch } from "../../store";

interface Props {
  onComplete: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
}

export default function Onboarding({ onComplete, onToast }: Props) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { token, selectedFolder, folders } = state;

  const [step, setStep] = useState<"welcome" | "choose_workspace" | "upload_sources" | "preparing" | "ready">("welcome");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [filesList, setFilesList] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("Preparing knowledge base...");
  const [activeStepText, setActiveStepText] = useState("Generating embeddings...");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load folders on entering choose_workspace step
  useEffect(() => {
    if (step === "choose_workspace" && token) {
      listFolders(token)
        .then((f) => dispatch({ type: "SET_FOLDERS", folders: f }))
        .catch(() => {});
    }
  }, [step, token, dispatch]);

  // Load files when selectedFolder changes in upload_sources step
  useEffect(() => {
    if (step === "upload_sources" && token && selectedFolder) {
      listFiles(token, selectedFolder.folder_id)
        .then((files) => setFilesList(files))
        .catch(() => {});
    }
  }, [step, token, selectedFolder]);

  // Handle Preparing progress simulation
  useEffect(() => {
    if (step === "preparing") {
      setProgress(0);
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 8 + 4;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(interval);
          setTimeout(() => {
            setStep("ready");
          }, 600);
        }
        setProgress(Math.floor(currentProgress));

        if (currentProgress < 30) {
          setProgressText("Reading study materials...");
          setActiveStepText("Parsing files...");
        } else if (currentProgress < 65) {
          setProgressText("Splitting content into chunks...");
          setActiveStepText("Analyzing structure...");
        } else if (currentProgress < 90) {
          setProgressText("Generating semantic embeddings...");
          setActiveStepText("Running indexer...");
        } else {
          setProgressText("Building knowledge graph...");
          setActiveStepText("Finalizing database...");
        }
      }, 200);

      return () => clearInterval(interval);
    }
  }, [step]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newFolderName.trim()) return;
    try {
      const f = await createFolder(token, newFolderName.trim());
      dispatch({ type: "ADD_FOLDER", folder: f });
      dispatch({ type: "SELECT_FOLDER", folder: f });
      setNewFolderName("");
      setNewFolderDesc("");
      setShowCreateForm(false);
      onToast(`✅ Workspace "${f.folder_name}" created`, "success");
      setStep("upload_sources");
    } catch {
      onToast("❌ Failed to create workspace", "error");
    }
  };

  const handleSelectFolder = (folder: Folder) => {
    dispatch({ type: "SELECT_FOLDER", folder });
    setStep("upload_sources");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !token || !selectedFolder) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!["pdf", "pptx", "docx", "txt", "md"].includes(ext || "")) {
          onToast(`❌ Unsupported format: ${file.name}`, "error");
          continue;
        }
        
        // Optimistically add file
        const tempFile: FileItem = { file_id: `temp-${Date.now()}`, file_name: file.name, status: "processing" };
        setFilesList(prev => [...prev, tempFile]);

        await uploadFile(token, selectedFolder.folder_id, file);
      }
      
      // Refresh files list
      const updated = await listFiles(token, selectedFolder.folder_id);
      setFilesList(updated);
      onToast("✅ Materials successfully uploaded!", "success");
    } catch {
      onToast("❌ Failed to upload some files", "error");
      const updated = await listFiles(token, selectedFolder.folder_id).catch(() => filesList);
      setFilesList(updated);
    } finally {
      setUploading(false);
    }
  };

  const filteredFolders = folders.filter(f =>
    f.folder_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 1. Welcome Step
  if (step === "welcome") {
    return (
      <div className="flex flex-col min-h-screen bg-[#121414] text-[#e3e2e2] font-sans">
        <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-sm w-full fixed top-0 z-50">
          <div className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg font-bold text-on-surface">
            NoteAI
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center relative px-margin-mobile">
          {/* Background Glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[60%] h-[60%] bg-[#cabeff]/10 rounded-full blur-[120px]"></div>
          </div>

          <div className="relative z-10 w-full max-w-4xl aspect-[4/3] max-h-[360px] flex items-center justify-center animate-[float_6s_ease-in-out_infinite]">
            <img
              alt="NoteAI Welcome Illustration"
              className="max-w-[90%] max-h-[90%] object-contain drop-shadow-[0_20px_50px_rgba(124,92,255,0.2)]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCopox-Mrj_EszeX7uRnxVFfdwvm8jw8VVSNXvQY8Dmg1VNPjcI4fw33KwPhL_LmF43u5pg5h6MVdak9ZxshG_2jih0LttwLtZTAXWn9k-ClxFBiXg8SRGApBI3duW9PhtDZd3dCWezQnTugKhzTsgmd7Ra-fCvlj9zGkUY4y8d5oqGkGP4YQxpqrnMRVCCM1A9NRX9ReTLiM7jlCoCaRBO-V9AvQrpon8PB765-jvsMoXBzYRA2a2tv_tFCCoEv0GDm8t1Q79Q2y4"
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#121414] via-transparent to-[#121414] pointer-events-none"></div>
          </div>

          <div className="text-center max-w-2xl mt-xl z-20 space-y-md">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg font-bold text-on-surface tracking-tight">
              Welcome to NoteAI
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mx-auto">
              Let's build your first AI study workspace. Synthesize knowledge, research faster, and stay focused.
            </p>
            <div className="pt-md">
              <button
                onClick={() => setStep("choose_workspace")}
                className="bg-[#7C5CFF] hover:bg-[#6b4ae6] active:scale-95 transition-all duration-200 text-white font-title-md px-xl py-sm rounded-lg flex items-center gap-xs mx-auto group shadow-lg shadow-[#7C5CFF]/20"
              >
                Continue
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="absolute bottom-12 flex gap-xs">
            <div className="w-2 h-2 rounded-full bg-[#cabeff]"></div>
            <div className="w-2 h-2 rounded-full bg-[#343535]"></div>
            <div className="w-2 h-2 rounded-full bg-[#343535]"></div>
          </div>
        </main>
        
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]" style={{ backgroundImage: "radial-gradient(#e3e2e2 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
      </div>
    );
  }

  // 2. Choose Workspace Step
  if (step === "choose_workspace") {
    return (
      <div className="flex flex-col min-h-screen bg-[#121414] text-[#e3e2e2] font-sans">
        <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-sm w-full fixed top-0 z-50">
          <div className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg font-bold text-on-surface">
            NoteAI
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center relative px-margin-mobile py-[80px]">
          <div className="w-full max-w-2xl z-10 flex flex-col items-center">
            <div className="text-center mb-lg">
              <h1 className="font-display-lg text-display-lg text-on-surface mb-xs">Choose a Workspace</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant">Select an existing workspace or create a new one to begin.</p>
            </div>

            <section className="w-full bg-[#1f2020]/50 border border-[#484555]/30 rounded-xl p-sm md:p-md backdrop-blur-md shadow-2xl">
              <div className="relative mb-md">
                <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#292a2a] border-none rounded-lg py-sm pl-[48px] pr-sm text-body-md focus:ring-1 focus:ring-[#cabeff] transition-all placeholder:text-[#938ea1] outline-none text-[#e3e2e2]"
                  placeholder="Search Workspace..."
                  type="text"
                />
              </div>

              <div className="space-y-xs max-h-[300px] overflow-y-auto pr-xs">
                {/* Create New Workspace Item */}
                <div className="group">
                  <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="flex items-center justify-between w-full p-sm bg-[#1b1c1c] hover:bg-[#292a2a] rounded-lg transition-all text-left"
                  >
                    <div className="flex items-center gap-sm">
                      <div className="w-10 h-10 rounded-lg bg-[#cabeff]/10 flex items-center justify-center text-[#cabeff]">
                        <span className="material-symbols-outlined">{showCreateForm ? "remove" : "add"}</span>
                      </div>
                      <span className="font-title-md text-title-md text-[#cabeff]">Create New Workspace</span>
                    </div>
                    <span className="material-symbols-outlined text-[#484555] group-hover:text-[#cabeff] transition-colors">
                      {showCreateForm ? "expand_less" : "arrow_forward_ios"}
                    </span>
                  </button>

                  {showCreateForm && (
                    <form onSubmit={handleCreateFolder} className="bg-[#292a2a]/40 rounded-lg mt-xs p-sm md:p-md space-y-md border border-[#484555]/20">
                      <div className="space-y-xs">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">Workspace Name</label>
                        <input
                          required
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          className="w-full bg-[#0d0e0f] border border-[#484555] rounded-lg py-sm px-sm text-body-md focus:border-[#cabeff] focus:ring-0 outline-none transition-all text-[#e3e2e2]"
                          placeholder="e.g. Advanced Thermodynamics"
                          type="text"
                        />
                      </div>
                      <div className="space-y-xs">
                        <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">Description (Optional)</label>
                        <textarea
                          value={newFolderDesc}
                          onChange={(e) => setNewFolderDesc(e.target.value)}
                          className="w-full bg-[#0d0e0f] border border-[#484555] rounded-lg py-sm px-sm text-body-md focus:border-[#cabeff] focus:ring-0 outline-none transition-all resize-none text-[#e3e2e2]"
                          placeholder="Briefly describe the research or course scope..."
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-sm pt-xs">
                        <button type="submit" className="flex-1 bg-[#7C5CFF] text-white font-label-sm py-sm rounded-lg hover:brightness-110 transition-all shadow-lg shadow-[#7C5CFF]/20">
                          Create Workspace
                        </button>
                        <button type="button" onClick={() => setShowCreateForm(false)} className="px-md font-label-sm text-on-surface-variant hover:text-on-surface transition-colors">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Existing Folders */}
                {filteredFolders.map((folder) => (
                  <div key={folder.folder_id} className="relative group">
                    <button
                      onClick={() => handleSelectFolder(folder)}
                      className="flex items-center justify-between w-full p-sm bg-[#1f2020] hover:bg-[#292a2a] rounded-lg transition-all text-left border border-transparent hover:border-[#cabeff]/20"
                    >
                      <div className="flex items-center gap-sm">
                        <div className="w-10 h-10 rounded-lg bg-[#343535] flex items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined">folder</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-title-md text-title-md text-on-surface">{folder.folder_name}</span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant text-[11px]">Click to open workspace</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[#484555] group-hover:text-[#cabeff] transition-colors">arrow_forward_ios</span>
                    </button>
                  </div>
                ))}

                {filteredFolders.length === 0 && !showCreateForm && (
                  <div className="text-center py-md text-on-surface-variant font-body-md">
                    No workspaces found. Create a new one above!
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="absolute bottom-12 flex gap-xs">
            <div className="w-2 h-2 rounded-full bg-[#343535]"></div>
            <div className="w-2 h-2 rounded-full bg-[#cabeff]"></div>
            <div className="w-2 h-2 rounded-full bg-[#343535]"></div>
          </div>
        </main>
      </div>
    );
  }

  // 3. Upload Sources Step
  if (step === "upload_sources") {
    return (
      <div className="flex flex-col min-h-screen bg-[#121414] text-[#e3e2e2] font-sans">
        <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-sm w-full fixed top-0 z-50 bg-[#121414]">
          <div className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg font-bold text-on-surface">
            NoteAI
          </div>
          <div className="text-[#cabeff] font-title-md flex items-center gap-xs">
            <span className="material-symbols-outlined">folder</span>
            {selectedFolder?.folder_name}
          </div>
        </header>

        <main className="flex-1 relative flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop overflow-y-auto pt-[80px] pb-[80px]">
          <div className="w-full max-w-2xl z-10 flex flex-col items-center">
            <div className="text-center mb-lg">
              <h1 className="font-display-lg text-display-lg text-on-surface mb-xs">Add your study materials</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant">Upload PDFs, PPTs, DOCX, Markdown or Text files.</p>
            </div>

            {/* Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-64 border-2 border-dashed border-[#484555] hover:border-[#7C5CFF] bg-[#161616] rounded-xl flex flex-col items-center justify-center transition-all duration-300 group cursor-pointer"
            >
              <div className="flex flex-col items-center space-y-sm">
                {uploading ? (
                  <>
                    <div className="w-16 h-16 bg-[#222222] rounded-full flex items-center justify-center text-[#cabeff]">
                      <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
                    </div>
                    <div className="text-center">
                      <p className="font-title-md text-title-md text-on-surface">Uploading materials...</p>
                      <p className="font-body-md text-body-md text-on-surface-variant">AI is extracting and processing text.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-[#222222] rounded-full flex items-center justify-center text-[#cabeff] group-hover:scale-110 transition-transform duration-300">
                      <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                    </div>
                    <div className="text-center">
                      <p className="font-title-md text-title-md text-on-surface">Drag and drop files here</p>
                      <p className="font-body-md text-body-md text-on-surface-variant">or select files from your computer</p>
                    </div>
                    <button
                      type="button"
                      className="mt-md px-xl py-sm bg-[#7C5CFF] hover:bg-[#6b4ae6] text-white rounded-full font-body-lg font-semibold transition-all scale-100 active:scale-95 shadow-lg shadow-[#7C5CFF]/20"
                    >
                      Browse Files
                    </button>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.pptx,.docx,.txt,.md"
                className="hidden"
                multiple
                type="file"
              />
            </div>

            {/* File List */}
            {filesList.length > 0 && (
              <div className="w-full mt-md space-y-xs max-h-[160px] overflow-y-auto bg-[#1b1c1c]/50 p-sm rounded-lg border border-[#484555]/20">
                {filesList.map((file, i) => (
                  <div key={file.file_id || i} className="flex justify-between items-center py-xs border-b border-[#484555]/10 last:border-0 text-sm">
                    <div className="flex items-center gap-xs truncate pr-md">
                      <span className="material-symbols-outlined text-on-surface-variant">description</span>
                      <span className="text-on-surface truncate">{file.file_name}</span>
                    </div>
                    <span className={`text-[11px] px-sm py-0.5 rounded-full uppercase tracking-wider shrink-0 ${file.status === "ready" ? "bg-emerald-500/10 text-emerald-400" : "bg-[#cabeff]/10 text-[#cabeff] animate-pulse"}`}>
                      {file.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Chips Section */}
            <div className="mt-lg flex flex-wrap justify-center gap-xs">
              <span className="px-md py-xs bg-[#222222] text-on-surface-variant rounded-full text-label-sm font-label-sm">PDF</span>
              <span className="px-md py-xs bg-[#222222] text-on-surface-variant rounded-full text-label-sm font-label-sm">PPTX</span>
              <span className="px-md py-xs bg-[#222222] text-on-surface-variant rounded-full text-label-sm font-label-sm">DOCX</span>
              <span className="px-md py-xs bg-[#222222] text-on-surface-variant rounded-full text-label-sm font-label-sm">TXT</span>
              <span className="px-md py-xs bg-[#222222] text-on-surface-variant rounded-full text-label-sm font-label-sm">MD</span>
            </div>

            {/* Actions */}
            <div className="mt-xl flex flex-col items-center gap-sm">
              <button
                onClick={() => setStep("preparing")}
                className="bg-[#7C5CFF] hover:bg-[#6b4ae6] text-white font-title-md px-xl py-sm rounded-lg flex items-center gap-xs mx-auto transition-all shadow-lg shadow-[#7C5CFF]/20"
              >
                Continue
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <button
                onClick={() => setStep("preparing")}
                className="text-on-surface-variant hover:text-on-surface font-label-sm py-xs px-sm uppercase tracking-wider text-[11px]"
              >
                Skip for now
              </button>
            </div>
          </div>

          <div className="absolute bottom-12 flex gap-xs">
            <div className="w-2 h-2 rounded-full bg-[#343535]"></div>
            <div className="w-2 h-2 rounded-full bg-[#343535]"></div>
            <div className="w-2 h-2 rounded-full bg-[#cabeff]"></div>
          </div>
        </main>
      </div>
    );
  }

  // 4. Preparing Workspace Step
  if (step === "preparing") {
    return (
      <div className="flex flex-col min-h-screen bg-[#121414] text-[#e3e2e2] font-sans">
        <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-sm w-full fixed top-0 z-50">
          <div className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg font-bold text-on-surface">
            NoteAI
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center relative px-margin-mobile">
          {/* Animated Brain Core Container */}
          <div className="relative w-64 h-64 flex items-center justify-center animate-[float_4s_ease-in-out_infinite] mb-xl">
            <div className="absolute w-48 h-48 bg-[#cabeff]/10 rounded-full blur-3xl animate-pulse"></div>
            <img
              alt="Neural network core"
              className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_40px_rgba(202,190,255,0.3)]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMSgCrZioZ2PRhiTbZ8tSqZ8EHWZ_Lb-65-xATH9FWkroV8e_xvC84VgQz2KXe6k2rY7nJXrNLSMNwSBq42fNoLyRRGaHHVmF92Z-qWG4XhFlhjBESRn4DkgLsvzm8RxfGeXIvzgrbQUwluCeAMdu_H4H6eK7yL77Sdt7kFNJMr0OCKaRI7rLBS1VIE6_WQjbMJadCYWLMf9q1Gvg-UjeAPAO1Fi4hpNK0lSAUDhHWAm31_l7gC_0R4tuGtD0Jb_keBXg4415i4Qw"
            />
          </div>

          <div className="text-center max-w-md mx-auto space-y-sm mb-lg">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg font-bold text-on-surface">
              Preparing your Workspace
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Structuring knowledge base and building semantic indexes.
            </p>
          </div>

          {/* Progress Checklist */}
          <section className="w-full max-w-sm space-y-sm">
            <div className="flex items-center justify-between p-sm rounded-xl bg-[#1b1c1c]/50 border border-[#484555]/10">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-[#cabeff]">check_circle</span>
                <span className="text-on-surface font-body-md">Reading documents</span>
              </div>
              <span className="text-label-sm text-[#cabeff] uppercase tracking-widest opacity-60 text-[11px]">Done</span>
            </div>

            <div className="flex items-center justify-between p-sm rounded-xl bg-[#1b1c1c]/50 border border-[#484555]/10">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-[#cabeff]">
                  {progress >= 30 ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span className="text-on-surface font-body-md">Splitting content into chunks</span>
              </div>
              <span className="text-label-sm text-[#cabeff] uppercase tracking-widest opacity-60 text-[11px]">
                {progress >= 30 ? "Done" : "Pending"}
              </span>
            </div>

            <div className={`flex items-center justify-between p-sm rounded-xl border transition-all duration-300 ${progress >= 30 && progress < 90 ? "bg-[#1f2020] border-[#cabeff]/30 shadow-[0_0_20px_rgba(124,92,255,0.1)]" : "bg-[#1b1c1c]/50 border-[#484555]/10"}`}>
              <div className="flex items-center gap-sm">
                {progress >= 30 && progress < 90 ? (
                  <span className="material-symbols-outlined text-[#cabeff] animate-spin text-[20px]">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[#cabeff]">
                    {progress >= 90 ? "check_circle" : "radio_button_unchecked"}
                  </span>
                )}
                <span className={`font-body-md ${progress >= 30 && progress < 90 ? "text-[#cabeff] font-bold" : "text-on-surface"}`}>
                  {activeStepText}
                </span>
              </div>
              {progress >= 30 && progress < 90 && (
                <div className="flex items-center gap-xs">
                  <div className="h-1 w-12 bg-[#343535] rounded-full overflow-hidden">
                    <div className="h-full bg-[#cabeff] w-2/3 animate-[pulse_1s_infinite]"></div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Dynamic Status Bar */}
          <footer className="mt-xl w-full max-w-sm">
            <div className="flex justify-between items-center text-label-sm text-on-surface-variant mb-xs px-xs text-[11px]">
              <span>SYSTEM STATUS: {progressText.toUpperCase()}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1 bg-[#343535] rounded-full overflow-hidden">
              <div className="h-full bg-[#cabeff] transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </footer>
        </main>
      </div>
    );
  }

  // 5. Ready Step
  if (step === "ready") {
    return (
      <div className="flex flex-col min-h-screen bg-[#121414] text-[#e3e2e2] font-sans">
        <header className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-sm w-full fixed top-0 z-50">
          <div className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg font-bold text-on-surface">
            NoteAI
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center relative px-margin-mobile pt-[80px]">
          {/* Confetti canvas */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[60%] h-[60%] bg-[#cabeff]/10 rounded-full blur-[120px]"></div>
          </div>

          {/* Success Checkmark Circle */}
          <div className="relative w-48 h-48 flex items-center justify-center animate-[float_5s_ease-in-out_infinite] mb-xl">
            <img
              alt="Ready Illustration"
              className="relative z-10 w-full h-full object-contain drop-shadow-[0_0_30px_rgba(202,190,255,0.4)]"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhObJuASBmFmH_PWHuC0MZOdjegWnQcFHGXW__6S9leKbfjbU1IP_07Ss1uKayantc8ZZrVnwcP7De-ocJzjvYhEc3mlGTj6DGy42mjbkG3ECSUrmiUipktYrrvwiJDqteQo6GinV82S9O93RW0wjNo1hq9dugNsNm_mC-uaEt3LX-sAukG68Lq9F59kiNMjd4TK7RvnM8f9UAqoz6g-VD31r1IsPqt4bpGf3UwqPRlEyWCVPNwEcv--BiT2WwJnIIqAkIlsM2yvQ"
            />
          </div>

          <div className="text-center max-w-2xl mx-auto space-y-sm mb-lg">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface tracking-tight font-bold">
              Your workspace is ready!
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mx-auto">
              Ask anything about your documents. Our AI has analyzed your sources and is ready to assist.
            </p>
          </div>

          {/* Suggested Prompts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm w-full max-w-2xl mb-xl">
            <button className="flex items-center gap-sm p-sm bg-[#1f2020] rounded-xl text-left border border-[#484555]/30 hover:bg-[#292a2a] transition-all group">
              <span className="material-symbols-outlined text-[#7C5CFF] group-hover:scale-110 transition-transform">summarize</span>
              <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors">Summarize these notes</span>
            </button>
            <button className="flex items-center gap-sm p-sm bg-[#1f2020] rounded-xl text-left border border-[#484555]/30 hover:bg-[#292a2a] transition-all group">
              <span className="material-symbols-outlined text-[#7C5CFF] group-hover:scale-110 transition-transform">quiz</span>
              <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors">Create flashcards</span>
            </button>
            <button className="flex items-center gap-sm p-sm bg-[#1f2020] rounded-xl text-left border border-[#484555]/30 hover:bg-[#292a2a] transition-all group">
              <span className="material-symbols-outlined text-[#7C5CFF] group-hover:scale-110 transition-transform">fact_check</span>
              <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors">Generate exam questions</span>
            </button>
            <button className="flex items-center gap-sm p-sm bg-[#1f2020] rounded-xl text-left border border-[#484555]/30 hover:bg-[#292a2a] transition-all group">
              <span className="material-symbols-outlined text-[#7C5CFF] group-hover:scale-110 transition-transform">lightbulb</span>
              <span className="font-body-md text-body-md text-on-surface-variant group-hover:text-on-surface transition-colors">Explain difficult concepts</span>
            </button>
          </div>

          {/* Primary Action */}
          <div className="flex flex-col items-center gap-md w-full mb-lg">
            <button
              onClick={onComplete}
              className="w-full md:w-auto min-w-[240px] py-md px-xl bg-[#7C5CFF] hover:bg-[#6b4ae6] text-white font-title-md text-title-md rounded-full active:scale-[0.98] transition-all flex items-center justify-center gap-sm shadow-[0_8px_32px_-8px_rgba(124,92,255,0.5)] font-bold"
            >
              Start Chatting
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
