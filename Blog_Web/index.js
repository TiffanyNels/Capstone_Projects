import express from "express";
import bodyParser from "body-parser";
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import methodOverride from "method-override";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, 'process.env') });

const app = express();
const port = 3000;

console.log('MONGODB_URI:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 50000,
  socketTimeoutMS: 45000,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: String,
  category: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  isFeatured: { type: Boolean, default: false }
});

const Post = mongoose.model('Post', postSchema);

// Submit Post Route
app.post('/submit-post', (req, res) => {
  
  const isFeatured = req.body.isFeatured ? true : false;

  const newPost = new Post({
    title: req.body.title,
    content: req.body.content,
    author: req.body.author,
    category: req.body.category.toLowerCase(),
    isFeatured: isFeatured,
    createdAt: new Date()
  });
  console.log(req.body)
  console.log(newPost)

  newPost.save()
    .then(() => res.redirect('/'))
    .catch(err => res.status(400).send('Error saving post: ' + err));
});

// Home Route with Featured and Recent Posts
app.get("/", async (req, res) => { 
  try {
    const recentPosts = await Post.find().sort({ createdAt: -1 }).limit(5).exec();
    const featuredPosts = await Post.find({ isFeatured: true }).sort({ createdAt: -1 }).limit(5).exec();
    res.render("index.ejs", { recentPosts, featuredPosts }); 
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
});

// Search Route
app.get("/search", async (req, res) => {
  const searchQuery = req.query.q;

  if (!searchQuery) {
    return res.redirect("/"); 
  }

  try {
    const searchResults = await Post.find({
      $or: [
        { title: { $regex: searchQuery, $options: "i" } },
        { content: { $regex: searchQuery, $options: "i" } }
      ]
    });

    res.render("search-results.ejs", { searchQuery, searchResults });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// Post Page Route
app.get('/post/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).exec();
    if (!post) {
      return res.status(404).render('404', { message: 'Post not found' });
    }

    const relatedPosts = await Post.find({ category: post.category }).limit(5).exec();
    res.render('postPage.ejs', { post, relatedPosts });
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
});

// Edit Post Route
app.get('/post/:id/edit', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).exec();
    if (!post) {
      return res.status(404).render('404', { message: 'Post not found' });
    }
    res.render('editPost.ejs', { post });
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
});

// Update Post Route
app.post('/post/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, {
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
      category: req.body.category.toLowerCase(),
      isFeatured: req.body.isFeatured ? true : false 
    });

    if (!post) {
      return res.status(404).send('Post not found');
    }

    res.redirect('/');
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
});

// Delete Post Route
app.delete('/post/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    
    if (!post) {
      return res.status(404).send('Post not found');
    }

    res.redirect('/');
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
});

// Static Pages
app.get("/about", (req, res) => {
  res.render("about.ejs");
});

app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});

app.get("/categories", (req, res) => {
  res.render("categories.ejs");
});

// Category Route
app.get('/category/:categoryName', async (req, res) => {
  const categoryName = req.params.categoryName.toLowerCase(); 
  const posts = await getPostsForCategory(categoryName);

  if (!posts || posts.length === 0) {
    return res.status(404).render('404', { categoryName });
  }

  res.render('categoryPage', { categoryName, posts });
});

// Function to get posts by category
function getPostsForCategory(categoryName) {
  return Post.find({ category: categoryName.toLowerCase() }).exec();
}

// Listen on Port
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
