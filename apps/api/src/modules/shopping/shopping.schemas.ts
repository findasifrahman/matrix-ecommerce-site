import { z } from 'zod';

export const searchByKeywordSchema = z.object({
  keyword: z.string().max(200).optional(),
  category: z.string().optional(),
  mainCategory: z.string().optional(),
  brandId: z.string().optional(),
  brandModelId: z.string().optional(),
  productTypeId: z.string().optional(),
  vendorId: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).max(100).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
  turnstileToken: z.string().min(1).max(4096).optional(),
});

export const getHotItemsSchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});
