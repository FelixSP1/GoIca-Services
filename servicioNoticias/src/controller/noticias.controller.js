import Parser from 'rss-parser';
const parser = new Parser({
    customFields: {
        item: ['content', 'description'],
    }
});

const RSS_FEEDS_GOICA = [
    { name: 'Ica', url: 'https://news.google.com/rss/search?q=turismo+provincia+ica&hl=es&gl=PE&ceid=PE:es' },
    { name: 'Chincha', url: 'https://news.google.com/rss/search?q=turismo+provincia+chincha&hl=es&gl=PE&ceid=PE:es' },
    { name: 'Palpa', url: 'https://news.google.com/rss/search?q=turismo+provincia+palpa&hl=es&gl=PE&ceid=PE:es' },
    { name: 'Nazca', url: 'https://news.google.com/rss/search?q=turismo+provincia+nazca&hl=es&gl=PE&ceid=PE:es' },
    { name: 'Pisco', url: 'https://news.google.com/rss/search?q=turismo+provincia+pisco&hl=es&gl=PE&ceid=PE:es' },
];

export const getNoticiasLocales = async (req, res) => {
    try {
        // Ejecutamos las peticiones RSS en paralelo (rápido)
        const newsPromises = RSS_FEEDS_GOICA.map(async (feed) => {
            const feedData = await parser.parseURL(feed.url);
            
            // Mapeamos los ítems de forma síncrona
            return feedData.items.map(item => ({
                titulo: item.title || 'Sin Título',
                descripcion: item.contentSnippet || '',
                fecha: item.isoDate || new Date().toISOString(),
                linkUrl: item.link,
                categoria: feed.name,
                imagen: null, // Siempre NULL
                prioridad: 'media',
            }));
        });

        // Resolvemos todas las peticiones RSS y consolidamos
        const resultsArray = await Promise.all(newsPromises);
        let aggregatedNews = resultsArray.flat();

        // Filtrado y Ordenamiento
        const uniqueLinks = new Set();
        aggregatedNews = aggregatedNews.filter(noticia => {
            if (uniqueLinks.has(noticia.linkUrl)) {
                return false;
            }
            uniqueLinks.add(noticia.linkUrl);
            return true;
        });
        
        aggregatedNews.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        res.json(aggregatedNews.slice(0, 15));

    } catch (error) {
        res.status(500).json({ message: "Error al obtener noticias agregadas." });
    }
};