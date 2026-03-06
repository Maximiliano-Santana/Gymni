import React from "react";

export default function AuthLayout({children}: {children: React.ReactNode}){
    return <>
    <div className="min-h-screen grid place-items-center px-4">
        { children }
    </div>
    </>
}