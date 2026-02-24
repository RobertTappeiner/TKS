/**
 * include.js
 * Lädt Header und Footer dynamisch in die HTML-Seiten.
 */

async function includeHTML() {
    const components = [
        { id: 'header-placeholder', file: 'header.html' },
        { id: 'footer-placeholder', file: 'footer.html' }
    ];

    for (const component of components) {
        const element = document.getElementById(component.id);
        if (element) {
            try {
                const response = await fetch(component.file);
                if (response.ok) {
                    const content = await response.text();
                    element.innerHTML = content;
                    
                    // Wichtig: Event feuern, damit script.js weiß, dass die Elemente da sind
                    const eventName = component.id === 'header-placeholder' ? 'headerLoaded' : 'footerLoaded';
                    document.dispatchEvent(new CustomEvent(eventName));
                } else {
                    console.error(`Fehler beim Laden von ${component.file}: ${response.statusText}`);
                }
            } catch (error) {
                console.error(`Fehler beim Laden von ${component.file}:`, error);
            }
        }
    }
}

// Sofort ausführen
includeHTML();
