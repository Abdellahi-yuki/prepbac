import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
import { X, Download, File } from 'lucide-react';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import { API_BASE_URL } from '../apiConfig';
const getFileUrl = (path) => path.startsWith('http') ? path : `${API_BASE_URL.replace('/api', '')}${path.startsWith('/') ? '' : '/'}${path}`;
import * as XLSX from 'xlsx';

// Fix for PDF warnings
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import './FileViewer.css';

/**
 * FileViewer Component
 * Refined for clean @cyntler/react-doc-viewer integration.
 * @param {Object} file - The file object containing nom and chemin_fichier
 * @param {Function} onClose - Callback to close the viewer
 */
const FileViewer = ({ file, onClose }) => {
    const [excelData, setExcelData] = React.useState(null);
    const [isExcel, setIsExcel] = React.useState(false);
    const [loadingExcel, setLoadingExcel] = React.useState(false);

    const [textContent, setTextContent] = React.useState(null);
    const [isTextFallback, setIsTextFallback] = React.useState(false);
    const [loadingText, setLoadingText] = React.useState(false);
    const [textError, setTextError] = React.useState(null);

    if (!file) return null;

    // Stable properties to avoid re-calculating everything on every parent re-render
    const fileNom = file.nom || file.file_name || file.name || '';
    const fileUri = file.chemin_fichier || file.file_path || file.path || file.media_url || '';

    // Construct full URL and set up docs for DocViewer
    const docs = useMemo(() => {
        const filepath = fileUri.startsWith('http') ? fileUri : getFileUrl(fileUri);
        return [{
            uri: filepath,
            fileName: fileNom || (fileUri.split('/').pop()) || 'document',
        }];
    }, [fileUri, fileNom]);

    // Handle File Type Detection (separate from useMemo to avoid side effects there)
    React.useEffect(() => {
        const uri = docs[0].uri;
        const ext = uri.split('.').pop().split('?')[0].toLowerCase();
        const docViewerSupported = ['bmp', 'csv', 'htm', 'html', 'jpg', 'jpeg', 'pdf', 'png', 'tiff', 'txt', 'mp4'];

        if (ext === 'xlsx' || ext === 'xls') {
            setIsExcel(true);
            setIsTextFallback(false);
        } else if (!docViewerSupported.includes(ext)) {
            setIsExcel(false);
            setIsTextFallback(true);
        } else {
            setIsExcel(false);
            setIsTextFallback(false);
        }
    }, [docs]);

    // Handle Custom Excel Loading
    React.useEffect(() => {
        if (!isExcel) return;

        const loadExcel = async () => {
            setLoadingExcel(true);
            try {
                const response = await fetch(docs[0].uri, { credentials: 'include' });
                const arrayBuffer = await response.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });

                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to HTML table
                const html = XLSX.utils.sheet_to_html(worksheet);
                setExcelData(html);
            } catch (err) {
                console.error("Error loading excel:", err);
                setExcelData('<div style="padding:20px; color:red;">Erreur lors du chargement du fichier Excel.</div>');
            } finally {
                setLoadingExcel(false);
            }
        };

        loadExcel();
    }, [isExcel, docs]);

    // Handle Custom Text Fallback Loading
    React.useEffect(() => {
        if (!isTextFallback) return;

        const loadText = async () => {
            setLoadingText(true);
            setTextError(null);
            try {
                const response = await fetch(docs[0].uri, { credentials: 'include' });
                if (!response.ok) throw new Error("Erreur de téléchargement du fichier");
                const text = await response.text();
                setTextContent(text);
            } catch (err) {
                console.error("Error loading text fallback:", err);
                setTextError("Impossible de charger l'aperçu du texte pour ce fichier.");
            } finally {
                setLoadingText(false);
            }
        };

        loadText();
    }, [isTextFallback, docs]);

    const download = () => {
        const link = document.createElement('a');
        link.href = docs[0].uri;
        link.download = docs[0].fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return ReactDOM.createPortal(
        <div className="fv-overlay">
            {/* Custom Theme Header */}
            <header className="fv-header">
                <div className="fv-info">
                    <File size={18} />
                    <span className="fv-filename">{docs[0].fileName}</span>
                </div>
                <div className="fv-actions">
                    <button onClick={download} className="fv-btn" title="Télécharger">
                        <Download size={20} />
                    </button>
                    <button onClick={onClose} className="fv-btn-close" title="Fermer">
                        <X size={22} />
                    </button>
                </div>
            </header>

            {/* Backdrop Area */}
            <div className="fv-body" onClick={onClose}>
                {/* DocViewer Container */}
                <div className="fv-viewer-container" onClick={(e) => e.stopPropagation()}>
                    {isExcel ? (
                        <div className="fv-excel-container">
                            {loadingExcel ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>Chargement d'Excel...</div>
                            ) : (
                                <div
                                    className="fv-excel-table"
                                    dangerouslySetInnerHTML={{ __html: excelData }}
                                />
                            )}
                        </div>
                    ) : isTextFallback ? (
                        <div className="fv-text-container">
                            {loadingText ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>Chargement du texte...</div>
                            ) : textError ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#de3232' }}>
                                    <p>{textError}</p>
                                    <br />
                                    <button onClick={download} className="fv-btn" style={{ margin: '0 auto', background: '#fdfdfd', color: '#333' }}>
                                        Télécharger le fichier
                                    </button>
                                </div>
                            ) : (
                                <pre className="fv-text-content">
                                    <code>{textContent}</code>
                                </pre>
                            )}
                        </div>
                    ) : (
                        <DocViewer
                            documents={docs}
                            pluginRenderers={DocViewerRenderers}
                            theme={{
                                primary: "#1c3586",
                                secondary: "#ffffff",
                                tertiary: "#ffffff", // Force white background for header area
                                textPrimary: "#18181b",
                                textSecondary: "#71717a",
                                textTertiary: "#94a3b8",
                                disableThemeScrollbar: true,
                            }}
                            config={{
                                header: {
                                    disableHeader: true,
                                    disableFileName: true,
                                },
                                pdfZoom: {
                                    defaultZoom: 1.1,
                                    zoomJump: 0.2,
                                },
                                pdfVerticalScrollByDefault: true,
                            }}
                            className="react-doc-viewer-custom"
                        />
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FileViewer;
