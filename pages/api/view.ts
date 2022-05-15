import { NextApiRequest, NextApiResponse } from "next";
import supabase from '@lib/supabase/private'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const page_slug = req.query.slug
    if (req.method === 'POST') {
        await supabase.rpc('increment_page_view', { page_slug });

        return res.status(200).json({
            message: `Successfully incremented page: ${req.query.slug}`
        })
    }

    if (req.method === 'GET') {
        const { data } = await supabase.from('pages').select('view_count').filter('slug', 'eq', page_slug);

        if (data) {
            return res.status(200).json({
                total: data[0]?.view_count || null
            })
        }
    }

    return res.status(400).json({
        message: 'Unsupported Request'
    })
}

export default handler