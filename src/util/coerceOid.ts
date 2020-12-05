import { getObjectId } from '../base';

export default function coerceOid(ref: string): string {
    return getObjectId(process.cwd(), ref);
}
