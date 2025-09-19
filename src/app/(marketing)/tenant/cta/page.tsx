import { headers } from "next/headers";

export default async function TenantCTA(){
    const headerList = await headers();
    const subdomain = headerList.get("x-tenant-subdomain");
    return <>
        <h1>Este subdominio no existe</h1>
        { subdomain }
        <p>Envía un correo a gymni@gmail.com para contratarlo</p>
    </>
}