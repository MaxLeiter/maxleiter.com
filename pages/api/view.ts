import { NextApiRequest, NextApiResponse } from "next";
import supabase from '@lib/supabase/private'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const page_slug = req.body.slug
    const http_referer = req.body.referer
    const secret_key = req.headers["x-secret-key"]
    
    if (secret_key !== process.env.SECRET_KEY) 
        return res.status(401).json({ message: 'Invalid secret' })
    
    if (req.method === 'POST') {
        await supabase.rpc('increment_page_view', { page_slug });
        await supabase.rpc('increment_referral_view', { page_slug, http_referer });

        return res.status(200).json({
            message: "Success"
        })
    }

    return res.status(400).send('Invalid request method')
}

export default handler
