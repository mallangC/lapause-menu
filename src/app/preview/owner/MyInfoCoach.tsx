"use client";

import PreviewCoach, { type CoachStep } from "../PreviewCoach";

const STEPS: CoachStep[] = [
  {
    selectors: ['[data-coach="mi-social"]'],
    noDot: true,
    pad: 16,
    // 모바일: 네모, 좌우 화면 끝까지
    mobileRadius: 0,
    mobilePadX: 16,
    title: "소셜 계정 연결",
    body: "이메일로 가입 후에도 Google·카카오 계정을 연결하면\n해당 계정으로도 소셜 로그인을 사용할 수 있어요.\n(같은 이메일의 계정만 연결할 수 있어요.)",
  },
  {
    selectors: ['[data-coach="mi-2fa"]'],
    pad: 16,
    // 모바일: 네모, 좌우 화면 끝까지
    mobileRadius: 0,
    mobilePadX: 16,
    title: "로그인 2단계 인증",
    body: "켜두면 새 기기에서 로그인할 때\n이메일로 받은 인증번호를 한 번 더 입력해요.\n인증한 기기는 최대 30일 동안 다시 묻지 않아요.",
  },
];

// 사장님 화면 내 정보 코치마크
export default function MyInfoCoach() {
  return (
    <PreviewCoach
      storageKey="preview_coach_owner_myinfo"
      intro={{
        title: "내 정보 화면이에요",
        body: "로그인 방법과 계정 보안을 관리해요.",
      }}
      steps={STEPS}
      outro={{
        title: "직접 눌러보세요",
        body: "2단계 인증을 켜고 끄거나 연결 버튼을 눌러보세요.\n미리보기라 실제 계정은 바뀌지 않아요.",
      }}
    />
  );
}
