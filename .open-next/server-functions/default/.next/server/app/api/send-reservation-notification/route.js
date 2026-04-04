(()=>{var e={};e.id=939,e.ids=[939],e.modules={2507:(e,t,r)=>{"use strict";r.d(t,{U:()=>o});var s=r(79429),i=r(44999);async function o(){let e=await (0,i.UL)();return(0,s.createServerClient)("https://yywoqaydqjcgpwxyantp.supabase.co","sb_publishable_e5Pbv68IVRK6G6NQtkPmvg_kFEMfU9h",{cookies:{getAll:()=>e.getAll(),setAll(t){try{t.forEach(({name:t,value:r,options:s})=>e.set(t,r,s))}catch{}}}})}},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},21111:(e,t,r)=>{"use strict";function s(e,t){let{companyName:r,slug:s,ordererName:i,ordererPhone:o,channel:n,deliveryType:a,desiredDatetime:p,productType:d,finalPrice:c,paid:l}=e,u=[["예약자",`${i}&nbsp;/&nbsp;${o}`],...n?[["채널",n]]:[],["수령 방법",a],...p?[["희망 일시",p]]:[],...d?[["상품 유형",d]]:[],...null!=c?[["최종 가격",`${c.toLocaleString()}원`]]:[],...null!=l?[["결제 상태",l?"결제완료":"미결제"]]:[]],x=u.map(([e,t],r)=>`
    <tr>
      <td style="padding:11px 18px;background:#faf7f2;color:#999;font-size:13px;width:100px;vertical-align:top;white-space:nowrap;${r<u.length-1?"border-bottom:1px solid #f0ebe3;":""}">${e}</td>
      <td style="padding:11px 18px;color:#2c2416;font-size:13px;${r<u.length-1?"border-bottom:1px solid #f0ebe3;":""}">${t}</td>
    </tr>`).join(""),g=`${t}/${s}/admin/dashboard`;return`<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ede9e2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:36px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(44,36,22,0.10);">

    <div style="background:linear-gradient(135deg,#c9a96e 0%,#b8934a 100%);padding:28px 32px 24px;">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.70);font-size:11px;letter-spacing:2.5px;text-transform:uppercase;">New Reservation</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;letter-spacing:-0.3px;">${r}</h1>
    </div>

    <div style="padding:28px 32px 20px;">
      <p style="margin:0 0 22px;color:#7a6f64;font-size:14px;line-height:1.7;">
        <strong style="color:#2c2416;">${i}</strong>님의 새로운 예약이 접수되었습니다.
      </p>
      <table style="width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #ede8e0;">
        ${x}
      </table>
    </div>

    <div style="padding:4px 32px 32px;text-align:center;">
      <a href="${g}" style="display:inline-block;background:#c9a96e;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
        대시보드에서 확인하기
      </a>
    </div>

    <div style="padding:16px 32px;background:#faf7f2;border-top:1px solid #f0ebe3;text-align:center;">
      <p style="margin:0;font-size:11px;color:#c0b8ae;">고객에게 직접 연락하여 예약을 확정해 주세요.</p>
    </div>
  </div>
</body>
</html>`}r.d(t,{p:()=>s})},21820:e=>{"use strict";e.exports=require("os")},27910:e=>{"use strict";e.exports=require("stream")},28354:e=>{"use strict";e.exports=require("util")},29021:e=>{"use strict";e.exports=require("fs")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},31189:(e,t,r)=>{"use strict";r.r(t),r.d(t,{patchFetch:()=>h,routeModule:()=>u,serverHooks:()=>f,workAsyncStorage:()=>x,workUnitAsyncStorage:()=>g});var s={};r.r(s),r.d(s,{POST:()=>l});var i=r(96559),o=r(48088),n=r(37719),a=r(32190),p=r(49526),d=r(2507),c=r(21111);async function l(e){try{let t=await (0,d.U)(),{data:{user:r}}=await t.auth.getUser();if(!r)return a.NextResponse.json({error:"Unauthorized"},{status:401});let{companyId:s,...i}=await e.json(),{data:o}=await t.from("companies").select("notification_email").eq("id",s).eq("owner_id",r.id).single(),n=o?.notification_email;if(!n)return a.NextResponse.json({ok:!0,skipped:"no notification_email"});let l=process.env.GMAIL_USER,u=process.env.GMAIL_APP_PASSWORD;if(!l||!u)return a.NextResponse.json({ok:!0,skipped:"no gmail config"});let x=e.headers.get("origin")??process.env.NEXT_PUBLIC_SITE_URL??"",g=(0,c.p)(i,x),f=p.createTransport({service:"gmail",auth:{user:l,pass:u}});return await f.sendMail({from:`"${i.companyName} 예약알림" <${l}>`,to:n,subject:`[새 예약] ${i.ordererName}님`,html:g}),a.NextResponse.json({ok:!0})}catch(e){return console.error("[send-reservation-notification]",e),a.NextResponse.json({ok:!1},{status:500})}}let u=new i.AppRouteRouteModule({definition:{kind:o.RouteKind.APP_ROUTE,page:"/api/send-reservation-notification/route",pathname:"/api/send-reservation-notification",filename:"route",bundlePath:"app/api/send-reservation-notification/route"},resolvedPagePath:"/Users/mallang/Desktop/coding/frontend/lapause-menu/src/app/api/send-reservation-notification/route.ts",nextConfigOutput:"standalone",userland:s}),{workAsyncStorage:x,workUnitAsyncStorage:g,serverHooks:f}=u;function h(){return(0,n.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:g})}},33873:e=>{"use strict";e.exports=require("path")},34631:e=>{"use strict";e.exports=require("tls")},37366:e=>{"use strict";e.exports=require("dns")},44870:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},55511:e=>{"use strict";e.exports=require("crypto")},55591:e=>{"use strict";e.exports=require("https")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},74075:e=>{"use strict";e.exports=require("zlib")},78335:()=>{},79551:e=>{"use strict";e.exports=require("url")},79646:e=>{"use strict";e.exports=require("child_process")},81630:e=>{"use strict";e.exports=require("http")},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")},96487:()=>{}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[447,555,580,871],()=>r(31189));module.exports=s})();