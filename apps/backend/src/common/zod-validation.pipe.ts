import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { type ZodSchema } from "zod";

export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        error: "Payload inválido",
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message }))
      });
    }
    return parsed.data;
  }
}

