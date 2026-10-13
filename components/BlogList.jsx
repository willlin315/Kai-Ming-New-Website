import posts from '../content/blog-posts.json';
import { basePath } from '../lib/content';
export default function BlogList() {
  return <div className="km-news-list">{posts.map((post) => <article key={post.title} className="km-news-card">
    <img src={post.image.replaceAll('__BASE__', basePath)} alt={post.title} width="454" height="341" />
    <div className="km-news-card-content"><h2>{post.title}</h2><a href={post.href}>Read story</a></div>
  </article>)}</div>;
}
