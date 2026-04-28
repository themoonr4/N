// THE MOON - Professional News API
// Deploy on Cloudflare Workers

import { createClient } from '@supabase/supabase-js'

// Environment variables (set in Cloudflare dashboard)
const SUPABASE_URL = 'YOUR_SUPABASE_URL'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'
const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_KEY'
const JWT_SECRET = 'YOUR_JWT_SECRET'

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
}

// Rate limiting configuration
const rateLimit = new Map()

function checkRateLimit(ip, limit = 100, window = 60000) {
    const now = Date.now()
    const windowStart = now - window
    const requests = rateLimit.get(ip) || []
    const recentRequests = requests.filter(t => t > windowStart)
    
    if (recentRequests.length >= limit) {
        return false
    }
    
    recentRequests.push(now)
    rateLimit.set(ip, recentRequests)
    return true
}

// Authentication middleware
async function authenticate(request) {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
    }
    
    const token = authHeader.split(' ')[1]
    
    // Verify JWT token
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error) throw error
        return user
    } catch (error) {
        return null
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url)
        const path = url.pathname
        const method = request.method
        const ip = request.headers.get('CF-Connecting-IP')
        
        // CORS preflight
        if (method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders })
        }
        
        // Rate limiting
        if (!checkRateLimit(ip)) {
            return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        
        // ========== PUBLIC ROUTES ==========
        
        // GET /api/news - Paginated news feed
        if (path === '/api/news' && method === 'GET') {
            const page = parseInt(url.searchParams.get('page') || '1')
            const limit = parseInt(url.searchParams.get('limit') || '20')
            const category = url.searchParams.get('category')
            const featured = url.searchParams.get('featured') === 'true'
            const offset = (page - 1) * limit
            
            let query = supabase
                .from('news')
                .select(`
                    *,
                    categories (name, slug, color),
                    profiles (full_name, avatar_url)
                `)
                .eq('status', 'published')
                .order('published_at', { ascending: false })
                .range(offset, offset + limit - 1)
            
            if (category) {
                query = query.eq('categories.slug', category)
            }
            
            if (featured) {
                query = query.eq('is_featured', true)
            }
            
            const { data, error, count } = await query
            
            if (error) {
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                })
            }
            
            return new Response(JSON.stringify({
                data,
                pagination: { page, limit, total: count }
            }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        // GET /api/news/:slug - Single news
        if (path.startsWith('/api/news/') && method === 'GET') {
            const slug = path.split('/')[3]
            
            // Increment views
            await supabase.rpc('increment_views', { news_id: slug })
            
            const { data, error } = await supabase
                .from('news')
                .select(`
                    *,
                    categories (*),
                    profiles (full_name, avatar_url),
                    comments (
                        *,
                        profiles (full_name, avatar_url)
                    )
                `)
                .eq('slug', slug)
                .eq('status', 'published')
                .single()
            
            if (error) {
                return new Response(JSON.stringify({ error: 'News not found' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                })
            }
            
            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        // GET /api/categories - All categories
        if (path === '/api/categories' && method === 'GET') {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name')
            
            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        // GET /api/search - Search news
        if (path === '/api/search' && method === 'GET') {
            const q = url.searchParams.get('q')
            
            if (!q) {
                return new Response(JSON.stringify({ error: 'Query parameter required' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                })
            }
            
            const { data, error } = await supabase
                .from('news')
                .select('*')
                .eq('status', 'published')
                .textSearch('title', q)
                .limit(20)
            
            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        // GET /api/trending - Trending news
        if (path === '/api/trending' && method === 'GET') {
            const { data, error } = await supabase
                .from('news')
                .select('*')
                .eq('status', 'published')
                .order('views', { ascending: false })
                .limit(10)
            
            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        // ========== AUTHENTICATED ROUTES ==========
        
        const user = await authenticate(request)
        
        // POST /api/comments - Add comment
        if (path === '/api/comments' && method === 'POST') {
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
            }
            
            const body = await request.json()
            const { data, error } = await supabase
                .from('comments')
                .insert({
                    news_id: body.news_id,
                    user_id: user.id,
                    content: body.content,
                    parent_id: body.parent_id || null
                })
                .select()
            
            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        // POST /api/bookmarks - Add bookmark
        if (path === '/api/bookmarks' && method === 'POST') {
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
            }
            
            const body = await request.json()
            const { error } = await supabase
                .from('bookmarks')
                .insert({
                    user_id: user.id,
                    news_id: body.news_id
                })
            
            return new Response(JSON.stringify({ success: !error }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        // DELETE /api/bookmarks/:id - Remove bookmark
        if (path.startsWith('/api/bookmarks/') && method === 'DELETE') {
            if (!user) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
            }
            
            const newsId = path.split('/')[3]
            const { error } = await supabase
                .from('bookmarks')
                .delete()
                .eq('user_id', user.id)
                .eq('news_id', newsId)
            
            return new Response(JSON.stringify({ success: !error }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        // ========== ADMIN ROUTES ==========
        
        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user?.id)
            .single()
        
        const isAdmin = profile?.role === 'admin'
        
        // POST /api/admin/news - Create news
        if (path === '/api/admin/news' && method === 'POST') {
            if (!isAdmin) {
                return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
            }
            
            const body = await request.json()
            const slug = body.title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
            
            const reading_time = Math.ceil(body.content.split(/\s+/).length / 200)
            
            const { data, error } = await adminSupabase
                .from('news')
                .insert({
                    title: body.title,
                    slug,
                    excerpt: body.excerpt,
                    content: body.content,
                    category_id: body.category_id,
                    author_id: user.id,
                    featured_image: body.featured_image,
                    images: body.images || [],
                    tags: body.tags || [],
                    is_featured: body.is_featured || false,
                    is_premium: body.is_premium || false,
                    status: body.status || 'draft',
                    published_at: body.status === 'published' ? new Date() : null,
                    reading_time
                })
                .select()
            
            // Clear CDN cache
            await env.THE_MOON_CACHE.purgeEverything()
            
            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        // PUT /api/admin/news/:id - Update news
        if (path.startsWith('/api/admin/news/') && method === 'PUT') {
            if (!isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
            
            const id = path.split('/')[4]
            const body = await request.json()
            
            const { data, error } = await adminSupabase
                .from('news')
                .update(body)
                .eq('id', id)
                .select()
            
            await env.THE_MOON_CACHE.purgeEverything()
            
            return new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        // DELETE /api/admin/news/:id - Delete news
        if (path.startsWith('/api/admin/news/') && method === 'DELETE') {
            if (!isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
            
            const id = path.split('/')[4]
            const { error } = await adminSupabase
                .from('news')
                .delete()
                .eq('id', id)
            
            await env.THE_MOON_CACHE.purgeEverything()
            
            return new Response(JSON.stringify({ success: !error }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        // POST /api/admin/upload - Image upload to R2
        if (path === '/api/admin/upload' && method === 'POST') {
            if (!isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
            
            const formData = await request.formData()
            const file = formData.get('image')
            const fileName = `${Date.now()}-${file.name}`
            
            await env.MY_BUCKET.put(fileName, file.stream(), {
                httpMetadata: { contentType: file.type }
            })
            
            const imageUrl = `https://pub-${env.R2_ACCOUNT_ID}.r2.dev/${fileName}`
            
            return new Response(JSON.stringify({ url: imageUrl }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        // GET /api/admin/stats - Dashboard statistics
        if (path === '/api/admin/stats' && method === 'GET') {
            if (!isAdmin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
            
            const [totalNews, totalViews, totalComments, totalUsers] = await Promise.all([
                supabase.from('news').select('*', { count: 'exact', head: true }),
                supabase.from('news').select('views').then(res => res.data.reduce((a,b) => a + b.views, 0)),
                supabase.from('comments').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true })
            ])
            
            return new Response(JSON.stringify({
                total_news: totalNews.count,
                total_views: totalViews,
                total_comments: totalComments.count,
                total_users: totalUsers.count
            }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            })
        }
        
        return new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
    }
}
