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
  useUnifiedTopology: true
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
  createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

app.post('/submit-post', (req, res) => {
  const newPost = new Post({
    title: req.body.title,
    content: req.body.content,
    author: req.body.author,
    category: req.body.category.toLowerCase(),
    createdAt: new Date()
  });

  newPost.save()
    .then(() => res.redirect('/'))
    .catch(err => res.status(400).send('Error saving post: ' + err));
});

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

app.post('/post/:id', async (req, res) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, {
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
      category: req.body.category.toLowerCase(),
    });
    res.redirect('/');
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
});

app.delete('/post/:id', async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.redirect('/');
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
});

app.get("/about", (req, res) => {
  res.render("about.ejs");
});

app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});

app.get("/categories", (req, res) => {
  res.render("categories.ejs");
});

app.get('/category/:categoryName', async (req, res) => {
  const categoryName = req.params.categoryName.toLowerCase(); 
  const posts = await getPostsForCategory(categoryName);

  if (!posts || posts.length === 0) {
    return res.status(404).render('404', { categoryName });
  }

  res.render('categoryPage', { categoryName, posts });
});

function getPostsForCategory(categoryName) {
  return Post.find({ category: categoryName.toLowerCase() }).exec();
}

app.get('/post/:id', async (req, res) => {
  const postId = req.params.id;
  try {
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).render('404', { message: 'Post not found' });
    }
    res.render('postPage', { post });
  } catch (err) {
    console.log(err);
    res.status(500).send('Server Error');
  }
});


app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
  