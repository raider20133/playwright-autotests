import {createHmac} from 'node:crypto';

const b64url = (value: object | string) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

/** A well-formed HS256 JWT signed with a secret the server does not know. */
export function forgedToken(payload: object): string {
    const unsigned = `${b64url({alg: 'HS256', typ: 'JWT'})}.${b64url({...payload, iat: Math.floor(Date.now() / 1000)})}`;
    return `${unsigned}.${createHmac('sha256', 'not-the-server-secret').update(unsigned).digest('base64url')}`;
}

/** The classic "alg: none" token with no signature at all. */
export function unsignedToken(payload: object): string {
    return `${b64url({alg: 'none', typ: 'JWT'})}.${b64url(payload)}.`;
}
