document.addEventListener('DOMContentLoaded', () => {
    const documentSelector = document.getElementById('document-selector');
    const documentView = document.getElementById('document-view');
    const searchInput = document.getElementById('search-input');
    const prevResultButton = document.getElementById('prev-result');
    const nextResultButton = document.getElementById('next-result');
    const clearSearchButton = document.getElementById('clear-search');
    const searchResultsInfo = document.getElementById('search-results-info');
    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const loadingMessage = document.getElementById('loading-message');

    let currentFontSize = 16; // Base font size in px for zoom
    let searchMatches = [];
    let currentMatchIndex = -1;
    let originalContent = ''; // Para restaurar después de quitar resaltado

    // --- Lista de Documentos (podría venir de un JSON o API en el futuro) ---
    const documents = [
        { name: "Ley Orgánica Ministerio Público", path: "docs/ley_organica_ministerio_publico.html" },
        // Agrega más documentos aquí
    ];

    function populateDocumentSelector() {
        documents.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.path;
            option.textContent = doc.name;
            documentSelector.appendChild(option);
        });
    }

    async function loadDocument(path) {
        if (!path) {
            documentView.src = 'about:blank'; // Limpia el iframe
            originalContent = '';
            loadingMessage.textContent = "Seleccione un documento para comenzar.";
            loadingMessage.style.display = 'block';
            documentView.style.display = 'none';
            clearSearchResults();
            return;
        }

        loadingMessage.textContent = "Cargando documento...";
        loadingMessage.style.display = 'block';
        documentView.style.display = 'none';

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Error al cargar el documento: ${response.statusText}`);
            }
            const htmlContent = await response.text();
            originalContent = htmlContent; // Guardar contenido original
            
            // Escribir contenido en el iframe
            documentView.srcdoc = htmlContent; // Usar srcdoc para contenido HTML directo
            
            // Esperar a que el iframe cargue su contenido
            documentView.onload = () => {
                adjustIframeContentStyle();
                loadingMessage.style.display = 'none';
                documentView.style.display = 'block';
                clearSearchResults(); // Limpiar búsqueda anterior al cargar nuevo doc
            };


        } catch (error) {
            console.error("Error:", error);
            loadingMessage.textContent = `Error al cargar: ${error.message}`;
            documentView.src = 'about:blank';
            originalContent = '';
        }
    }
    
    function adjustIframeContentStyle() {
        const iframeDoc = documentView.contentDocument || documentView.contentWindow.document;
        if (iframeDoc && iframeDoc.body) {
            iframeDoc.body.style.fontSize = `${currentFontSize}px`;
            // Puedes añadir más estilos base si los documentos HTML no los tienen
            // iframeDoc.body.style.fontFamily = 'sans-serif';
            // iframeDoc.body.style.lineHeight = '1.6';
            // iframeDoc.body.style.padding = '20px'; // Evita que el contenido toque los bordes
        }
    }


    function highlightTextInIframe(searchTerm) {
        const iframeDoc = documentView.contentDocument || documentView.contentWindow.document;
        if (!iframeDoc || !iframeDoc.body || !searchTerm.trim()) {
            clearSearchResults();
            return;
        }

        // Restaurar contenido original antes de una nueva búsqueda
        iframeDoc.body.innerHTML = originalContent; 
        adjustIframeContentStyle(); // Re-aplicar zoom

        searchMatches = [];
        currentMatchIndex = -1;

        const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
        let matchCount = 0;

        // Función recursiva para recorrer nodos de texto y reemplazar
        function traverseAndReplace(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent.match(regex)) {
                    const fragment = iframeDoc.createDocumentFragment();
                    let lastIndex = 0;
                    node.textContent.replace(regex, (match, p1, offset) => {
                        // Texto antes del match
                        fragment.appendChild(iframeDoc.createTextNode(node.textContent.substring(lastIndex, offset)));
                        
                        // El match resaltado
                        const mark = iframeDoc.createElement('mark');
                        mark.className = 'search-highlight';
                        mark.textContent = match;
                        mark.id = `match-${matchCount}`;
                        searchMatches.push(mark);
                        matchCount++;
                        fragment.appendChild(mark);
                        
                        lastIndex = offset + match.length;
                    });
                    // Texto después del último match
                    fragment.appendChild(iframeDoc.createTextNode(node.textContent.substring(lastIndex)));
                    node.parentNode.replaceChild(fragment, node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
                // Clonar array de hijos para evitar problemas con la modificación en vivo
                Array.from(node.childNodes).forEach(child => traverseAndReplace(child));
            }
        }
        
        traverseAndReplace(iframeDoc.body);
        updateSearchResultsInfo();

        if (searchMatches.length > 0) {
            navigateToMatch(0);
        }
    }

    function clearSearchResults() {
        const iframeDoc = documentView.contentDocument || documentView.contentWindow.document;
        if (iframeDoc && iframeDoc.body && originalContent) {
            iframeDoc.body.innerHTML = originalContent; // Restaurar desde el original guardado
            adjustIframeContentStyle(); // Re-aplicar zoom
        }
        searchMatches = [];
        currentMatchIndex = -1;
        searchResultsInfo.textContent = '0/0';
        searchInput.value = ''; // Limpiar input de búsqueda
    }
    
    function navigateToMatch(index) {
        if (searchMatches.length === 0 || index < 0 || index >= searchMatches.length) return;

        if (currentMatchIndex !== -1) {
            searchMatches[currentMatchIndex].style.backgroundColor = 'yellow'; // Color normal
        }
        currentMatchIndex = index;
        const currentMatchElement = searchMatches[currentMatchIndex];
        currentMatchElement.style.backgroundColor = 'orange'; // Color destacado para el actual
        
        // Scroll hacia el elemento dentro del iframe
        currentMatchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        updateSearchResultsInfo();
    }

    function updateSearchResultsInfo() {
        searchResultsInfo.textContent = `${searchMatches.length > 0 ? currentMatchIndex + 1 : 0}/${searchMatches.length}`;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& significa toda la cadena coincidente
    }


    // --- Event Listeners ---
    documentSelector.addEventListener('change', (e) => {
        loadDocument(e.target.value);
    });

    searchInput.addEventListener('input', () => { // Búsqueda en tiempo real (o casi)
        highlightTextInIframe(searchInput.value);
    });
    // Para búsqueda al presionar Enter (opcional si ya tienes 'input')
    // searchInput.addEventListener('keypress', (e) => {
    //     if (e.key === 'Enter') {
    //         highlightTextInIframe(searchInput.value);
    //     }
    // });

    prevResultButton.addEventListener('click', () => {
        if (currentMatchIndex > 0) {
            navigateToMatch(currentMatchIndex - 1);
        } else if (searchMatches.length > 0) { // Loop al final
            navigateToMatch(searchMatches.length - 1);
        }
    });

    nextResultButton.addEventListener('click', () => {
        if (currentMatchIndex < searchMatches.length - 1) {
            navigateToMatch(currentMatchIndex + 1);
        } else if (searchMatches.length > 0) { // Loop al inicio
            navigateToMatch(0);
        }
    });
    
    clearSearchButton.addEventListener('click', () => {
        clearSearchResults();
    });

    zoomInButton.addEventListener('click', () => {
        currentFontSize += 2;
        adjustIframeContentStyle();
    });

    zoomOutButton.addEventListener('click', () => {
        if (currentFontSize > 8) { // Límite mínimo
            currentFontSize -= 2;
            adjustIframeContentStyle();
        }
    });

    // --- Inicialización ---
    populateDocumentSelector();
    loadDocument(''); // Cargar estado inicial vacío
    
    // Registrar Service Worker (para PWA - offline básico, etc.)
    // if ('serviceWorker' in navigator) {
    //     window.addEventListener('load', () => {
    //         navigator.serviceWorker.register('/service-worker.js') // Necesitarías crear este archivo
    //             .then(registration => {
    //                 console.log('ServiceWorker registration successful with scope: ', registration.scope);
    //             })
    //             .catch(error => {
    //                 console.log('ServiceWorker registration failed: ', error);
    //             });
    //     });
    // }
});