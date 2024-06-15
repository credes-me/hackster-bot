const axios = require('axios');



// Function to upload article to Wix collection
const uploadArticleToWix = async (article) => {
    const wixApiUrl = 'https://www.hackster.in/_functions/newArticle'; // Replace with your site URL and function endpoint
    console.log(article);
    try {
        if (typeof article.created_at === 'string') {
            article.created_at = new Date(article.created_at);
        }
        const response = await axios.post(wixApiUrl, article, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error publishing article to Wix:', error.response ? error.response.data : error.message);
        throw new Error(`Failed to publish article. Error: ${error.message}`);
    }
};


const formatArticleForWix = (article) => {
    return {
        title: article.title,
        description: article.description,
        link: article.link,
        category: article.category,
        tags: article.tags,
        created_at: article.created_at
    };
};

module.exports = {
    uploadArticleToWix
};
