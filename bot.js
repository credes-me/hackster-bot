const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const {  uploadArticleToWix } = require('./wix'); 


const token = '7454701787:AAEFimSaEAwvCEE158SiH1rExC-xGOnRCxA';

const bot = new TelegramBot(token, { polling: true });

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'tags_and_categories.json'), 'utf-8'));
const categories = data.categories;


// Function to handle the start command
const handleStart = (msg) => {
    bot.sendMessage(msg.chat.id, 'Hi! Use /newarticle to create a new article.');
};

// Function to handle the new article command
const handleNewArticle = (msg) => {
    const chatId = msg.chat.id;
    const categoryList = categories.map((cat, index) => `${index + 1}. ${cat.name}`).join('\n');
    bot.sendMessage(chatId, `Choose a category by number:\n\n${categoryList}`);
    bot.once('message', (msg) => handleCategorySelection(msg, chatId));
};


const handleCategorySelection = (msg, chatId) => {
    try {
        const categoryIndex = parseInt(msg.text) - 1;
        if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= categories.length) {
          bot.sendMessage(chatId, 'Invalid category selection. Please use /newarticle to start over.');
          return;
        }
        const selectedCategory = categories[categoryIndex];
        const tagList = selectedCategory.tags.map((tag, index) => `${index + 1}. ${tag}`).join('\n');
        bot.sendMessage(chatId, `Selected Category:\n\n"${selectedCategory.name}"\n\nNow choose tags by number (comma-separated):\n\n${tagList}`);
        bot.once('message', (msg) => handleTagSelection(msg, chatId, selectedCategory));
    } catch (error) {
        console.error('Error in handleCategorySelection:', error);
        bot.sendMessage(chatId, 'An error occurred. Please try again.');
    }
};

// Function to handle tag selection
const handleTagSelection = (msg, chatId, category) => {
  try{
    
    const tagIndices = msg.text.split(',').map((index) => parseInt(index.trim()) - 1);
    
    if (tagIndices.some(isNaN) || tagIndices.some(index => index < 0 || index >= category.tags.length)) {
      bot.sendMessage(chatId, 'Invalid tag selection. Please use /newarticle to start over.');
      return;
    }

    const selectedTags = tagIndices.map((index) => category.tags[index]).filter(tag => tag);
    
    if (selectedTags.length > 0) {
        bot.sendMessage(chatId, `Title:\nDescription:\nLink:`);
        bot.sendMessage(chatId, `You selected the following tags:\n\n${selectedTags.join('\n')}\n\nNow create a article using this template:\n\n`);
        bot.once('message', (msg) => handleArticleDetails(msg, chatId, category, selectedTags));
    } else {
        bot.sendMessage(chatId, 'Invalid tag selection. Please use /newarticle to start over.');
    }
  
  }catch(error){
    console.error('Error in handleTagSelection:', error);
    bot.sendMessage(chatId, 'An error occurred. Please use /newarticle to start over.');
  }
};

// Function to handle article details
const handleArticleDetails = (msg, chatId, category, tags) => {
    try {
      
      const lines = msg.text.split('\n');
      const article = {
        title: '',
        description: '',
        link: '',
        category: category.name,
        tags,
        created_at: new Date().toISOString()
      };
  
      lines.forEach(line => {
        const [key, ...value] = line.split(':');
        const trimmedKey = key.trim().toLowerCase();
        const trimmedValue = value.join(':').trim();
        if (trimmedKey === 'title') {
          article.title = trimmedValue;
        } else if (trimmedKey === 'description') {
          article.description = trimmedValue;
        } else if (trimmedKey === 'link') {
          article.link = trimmedValue;
        }
      });

      if (!article.title || !article.description || !article.link || !isValidURL(article.link)) {
        bot.sendMessage(chatId, 'Invalid format or missing details. Please use /newarticle to start over and follow the template.');
        return;
      }

      bot.sendMessage(chatId, `Please confirm the article details:\n\nTitle: ${article.title}\nDescription: ${article.description}\nLink: ${article.link}\nCategory: ${article.category}\nTags: ${article.tags.join(', ')}\n\nType "yes" to confirm or "no" to cancel.`);
      bot.once('message', (msg) => handleConfirmation(msg, chatId, article));

    } catch (error) {
      console.error('Error in handleArticleDetails:', error);
      bot.sendMessage(chatId, 'An error occurred. Please try again.');
    }
};

// Function to handle confirmation
const handleConfirmation = (msg, chatId, article) => {
  const confirmation = msg.text.trim().toLowerCase();
  if (confirmation === 'yes') {
    uploadArticleToWix(article)
    .then(() => {
        bot.sendMessage(chatId, 'Article saved and published successfully!');
    })
    .catch(error => {
        bot.sendMessage(chatId, `Failed to publish article. Error: ${error.message}`);
    });
  } else {
      bot.sendMessage(chatId, 'Article creation cancelled. Use /newarticle to start over.');
  }
};

// Function to validate URLs
const isValidURL = (url) => {
  const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
  return urlRegex.test(url);
};

// Function to save article to the JSON database
const saveArticleToDatabase = (article) => {
    try {
      const filePath = path.join(__dirname, 'articles.json');
      const articles = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      articles.push(article);
      fs.writeFileSync(filePath, JSON.stringify(articles, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error in saveArticleToDatabase:', error);
    }
};


// Handle "/start" command
bot.onText(/\/start/, handleStart);

// Handle "/newarticle" command
bot.onText(/\/newarticle/, handleNewArticle);

// Listen for any kind of message
bot.on('message', (msg) => {
    // Only handle messages that are not commands
    if (!msg.text.startsWith('/')) {
        // Implement any additional message handling if needed
    }
});