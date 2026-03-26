import slugify from "slugify";
import { prisma } from "../../lib/prisma";

export const generateUniqueSlug = async (title: string): Promise<string> => {
    const baseSlug = slugify(title, { lower: true, strict: true });
    const existing = await prisma.event.findMany({
        where: { slug: { startsWith: baseSlug } },
        select: { slug: true },
    });

    if (!existing.length) return baseSlug;

    const suffixes = existing.map((e) => {
        const match = e.slug.replace(baseSlug, "").match(/^-(\d+)$/);
        return match ? parseInt(match[1]) : 0;
    });

    return `${baseSlug}-${Math.max(...suffixes) + 1}`;
};