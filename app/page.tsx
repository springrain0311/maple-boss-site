"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Party = {
  id: number;
  boss: string;
  date: string;
  time: string;
  leader: string;
  current_members: number;
  max_members: number;
  status: string;
  condition: string | null;
  memo: string | null;
  created_at: string;
};

type Application = {
  id: number;
  party_id: number;
  nickname: string;
  created_at: string;
};

type Profile = {
  id: string;
  nickname: string;
  character_name: string;
  job: string;
  is_approved: boolean;
};

type GuildUser = {
  id: string;
  nickname: string;
  character_name: string;
  job: string;
  is_approved: boolean;
  created_at?: string | null;
};

const ADMIN_EMAIL = "c-tiger@naver.com";

export default function Home() {
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = String(Math.floor(i / 2)).padStart(2, "0");
    const minute = i % 2 === 0 ? "00" : "30";
    return `${hour}:${minute}`;
  });

  const formatTime = (timeValue: string) => {
    if (!timeValue) return "";
    return timeValue.slice(0, 5);
  };

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  const [parties, setParties] = useState<Party[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [guildUsers, setGuildUsers] = useState<GuildUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);

  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupNickname, setSignupNickname] = useState("");
  const [signupCharacterName, setSignupCharacterName] = useState("");
  const [signupJob, setSignupJob] = useState("");

  const [boss, setBoss] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [condition, setCondition] = useState("");
  const [memo, setMemo] = useState("");

  const [bossFilter, setBossFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOption, setSortOption] = useState<"latest" | "dateAsc" | "dateDesc">(
    "latest"
  );
  const [adminTab, setAdminTab] = useState<"pending" | "approved">("pending");

  const currentNickname =
    profile?.nickname ||
    (user?.user_metadata?.nickname as string | undefined) ||
    user?.email?.split("@")[0] ||
    "";

  const currentCharacterName =
    profile?.character_name ||
    (user?.user_metadata?.character_name as string | undefined) ||
    "";

  const currentJob =
    profile?.job || (user?.user_metadata?.job as string | undefined) || "";

  const isAdmin =
    (user?.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const isApproved = isAdmin || profile?.is_approved === true;

  const applicationsByParty = useMemo(() => {
    const grouped: Record<number, Application[]> = {};

    for (const application of applications) {
      if (!grouped[application.party_id]) {
        grouped[application.party_id] = [];
      }
      grouped[application.party_id].push(application);
    }

    return grouped;
  }, [applications]);

  const bossOptions = useMemo(() => {
    return Array.from(new Set(parties.map((party) => party.boss))).sort();
  }, [parties]);

  const filteredParties = useMemo(() => {
    const list = [...parties];

    const filtered = list.filter((party) => {
      const bossMatched = bossFilter === "all" || party.boss === bossFilter;
      const statusMatched = statusFilter === "all" || party.status === statusFilter;
      return bossMatched && statusMatched;
    });

    filtered.sort((a, b) => {
      if (sortOption === "latest") {
        return b.id - a.id;
      }

      const aDate = new Date(`${a.date}T${formatTime(a.time) || "00:00"}`);
      const bDate = new Date(`${b.date}T${formatTime(b.time) || "00:00"}`);

      if (sortOption === "dateAsc") {
        return aDate.getTime() - bDate.getTime();
      }

      return bDate.getTime() - aDate.getTime();
    });

    return filtered;
  }, [parties, bossFilter, statusFilter, sortOption]);

  const pendingUsers = useMemo(
    () => guildUsers.filter((item) => item.is_approved !== true),
    [guildUsers]
  );

  const approvedUsers = useMemo(
    () => guildUsers.filter((item) => item.is_approved === true),
    [guildUsers]
  );

  const loadMainData = async () => {
    setLoading(true);

    const [partiesResult, applicationsResult] = await Promise.allSettled([
      supabase.from("parties").select("*").order("id", { ascending: false }),
      supabase.from("applications").select("*").order("id", { ascending: true }),
    ]);

    if (partiesResult.status === "fulfilled") {
      if (partiesResult.value.error) {
        console.error("모집글 불러오기 실패:", partiesResult.value.error);
        setParties([]);
      } else {
        setParties(partiesResult.value.data || []);
      }
    } else {
      console.error("모집글 불러오기 실패:", partiesResult.reason);
      setParties([]);
    }

    if (applicationsResult.status === "fulfilled") {
      if (applicationsResult.value.error) {
        console.error("신청자 불러오기 실패:", applicationsResult.value.error);
        setApplications([]);
      } else {
        setApplications(applicationsResult.value.data || []);
      }
    } else {
      console.error("신청자 불러오기 실패:", applicationsResult.reason);
      setApplications([]);
    }

    setLoading(false);
  };

  const loadGuildUsers = async () => {
    if (!isAdmin && !user?.email) return;

    setAdminLoading(true);

    const { data, error } = await supabase
      .from("users")
      .select("id, nickname, character_name, job, is_approved, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("유저 목록 불러오기 실패:", error);
      setGuildUsers([]);
      setAdminLoading(false);
      return;
    }

    setGuildUsers((data as GuildUser[]) || []);
    setAdminLoading(false);
  };

  const ensureUserProfile = async (authUser: User) => {
    const fallbackNickname =
      (authUser.user_metadata?.nickname as string | undefined) ||
      authUser.email?.split("@")[0] ||
      "";

    const fallbackCharacterName =
      (authUser.user_metadata?.character_name as string | undefined) || "";

    const fallbackJob = (authUser.user_metadata?.job as string | undefined) || "";

    const fallbackProfile: Profile = {
      id: authUser.id,
      nickname: fallbackNickname,
      character_name: fallbackCharacterName,
      job: fallbackJob,
      is_approved: false,
    };

    setProfile(fallbackProfile);

    const { data, error } = await supabase
      .from("users")
      .select("id, nickname, character_name, job, is_approved")
      .eq("id", authUser.id)
      .single();

    if (error || !data) {
      const { error: upsertError } = await supabase.from("users").upsert(
        [
          {
            id: authUser.id,
            nickname: fallbackNickname,
            character_name: fallbackCharacterName,
            job: fallbackJob,
            is_approved: false,
          },
        ],
        { onConflict: "id" }
      );

      if (upsertError) {
        console.error("users 생성 실패:", upsertError);
      }

      setProfile(fallbackProfile);
      return;
    }

    setProfile({
      id: data.id,
      nickname: data.nickname || fallbackNickname,
      character_name: data.character_name || fallbackCharacterName,
      job: data.job || fallbackJob,
      is_approved: data.is_approved === true,
    });
  };

  const bootstrapUser = async (authUser: User) => {
    setProfileReady(false);
    await ensureUserProfile(authUser);
    await loadMainData();

    if ((authUser.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      await loadGuildUsers();
    } else {
      setGuildUsers([]);
    }

    setProfileReady(true);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setAuthReady(true);

      if (data.session?.user) {
        await bootstrapUser(data.session.user);
      } else {
        setProfile(null);
        setGuildUsers([]);
        setProfileReady(true);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setAuthReady(true);

      if (newSession?.user) {
        setTimeout(() => {
          void bootstrapUser(newSession.user);
        }, 0);
      } else {
        setProfile(null);
        setGuildUsers([]);
        setProfileReady(true);
        setParties([]);
        setApplications([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignup = async () => {
    if (
      !signupEmail ||
      !signupPassword ||
      !signupNickname ||
      !signupCharacterName ||
      !signupJob
    ) {
      alert("회원가입 항목을 전부 입력해줘.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: {
          nickname: signupNickname,
          character_name: signupCharacterName,
          job: signupJob,
        },
      },
    });

    if (error) {
      setAuthLoading(false);
      alert(`회원가입 실패: ${error.message}`);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("users").upsert(
        [
          {
            id: data.user.id,
            nickname: signupNickname,
            character_name: signupCharacterName,
            job: signupJob,
            is_approved: false,
          },
        ],
        { onConflict: "id" }
      );

      if (profileError) {
        console.error("users 저장 실패:", profileError);
      }
    }

    setSignupEmail("");
    setSignupPassword("");
    setSignupNickname("");
    setSignupCharacterName("");
    setSignupJob("");

    setAuthLoading(false);
    setAuthMessage("가입 완료! 이제 관리자 승인 후 사용할 수 있어.");
    setAuthMode("login");
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      alert("이메일과 비밀번호를 입력해줘.");
      return;
    }

    setAuthLoading(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setAuthLoading(false);
      alert(`로그인 실패: ${error.message}`);
      return;
    }

    setLoginPassword("");
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(`로그아웃 실패: ${error.message}`);
    }
  };

  const handleApproveUser = async (targetId: string) => {
    const { error } = await supabase
      .from("users")
      .update({ is_approved: true })
      .eq("id", targetId);

    if (error) {
      alert(`승인 실패: ${error.message}`);
      return;
    }

    setGuildUsers((prev) =>
      prev.map((item) =>
        item.id === targetId ? { ...item, is_approved: true } : item
      )
    );

    if (profile?.id === targetId) {
      setProfile((prev) =>
        prev ? { ...prev, is_approved: true } : prev
      );
    }
  };

  const handleRevokeUser = async (targetId: string) => {
    const { error } = await supabase
      .from("users")
      .update({ is_approved: false })
      .eq("id", targetId);

    if (error) {
      alert(`승인취소 실패: ${error.message}`);
      return;
    }

    setGuildUsers((prev) =>
      prev.map((item) =>
        item.id === targetId ? { ...item, is_approved: false } : item
      )
    );

    if (profile?.id === targetId) {
      setProfile((prev) =>
        prev ? { ...prev, is_approved: false } : prev
      );
    }
  };

  const handleAddParty = async () => {
    if (!isApproved) {
      alert("관리자 승인 후 모집글 작성이 가능해.");
      return;
    }

    if (!currentNickname) {
      alert("로그인 정보가 아직 없어서 모집글 작성이 안 돼.");
      return;
    }

    if (!boss || !date || !time || !maxMembers) {
      alert("보스명, 날짜, 시간, 최대 인원은 꼭 입력해줘.");
      return;
    }

    const max = Number(maxMembers);

    if (max <= 0) {
      alert("최대 인원은 1명 이상이어야 해.");
      return;
    }

    const timeToSave = `${time}:00`;

    const { data, error } = await supabase
      .from("parties")
      .insert([
        {
          boss,
          date,
          time: timeToSave,
          leader: currentNickname,
          current_members: 1,
          max_members: max,
          status: max === 1 ? "마감" : "모집중",
          condition,
          memo,
        },
      ])
      .select()
      .single();

    if (error) {
      alert(`모집글 저장 실패: ${error.message}`);
      return;
    }

    setBoss("");
    setDate("");
    setTime("");
    setMaxMembers("");
    setCondition("");
    setMemo("");

    if (data) {
      setParties((prev) => [data as Party, ...prev]);
    }
  };

  const handleDeleteParty = async (party: Party) => {
    if (!isApproved) {
      alert("관리자 승인 후 사용할 수 있어.");
      return;
    }

    if (party.leader !== currentNickname) {
      alert("본인이 만든 모집글만 삭제할 수 있어.");
      return;
    }

    const ok = confirm("이 모집글을 삭제할까?");
    if (!ok) return;

    const { error } = await supabase.from("parties").delete().eq("id", party.id);

    if (error) {
      alert(`삭제 실패: ${error.message}`);
      return;
    }

    setParties((prev) => prev.filter((item) => item.id !== party.id));
    setApplications((prev) => prev.filter((item) => item.party_id !== party.id));
  };

  const handleApply = async (party: Party) => {
    if (!isApproved) {
      alert("관리자 승인 후 신청할 수 있어.");
      return;
    }

    if (!currentNickname) {
      alert("로그인 후 신청할 수 있어.");
      return;
    }

    if (party.leader === currentNickname) {
      alert("파티장은 이미 포함된 상태야.");
      return;
    }

    if (party.current_members >= party.max_members || party.status === "마감") {
      alert("이미 마감된 파티야.");
      return;
    }

    const partyApplications = applicationsByParty[party.id] || [];
    const alreadyApplied = partyApplications.some(
      (item) => item.nickname === currentNickname
    );

    if (alreadyApplied) {
      alert("이미 신청한 파티야.");
      return;
    }

    const { data: appData, error: appError } = await supabase
      .from("applications")
      .insert([
        {
          party_id: party.id,
          nickname: currentNickname,
        },
      ])
      .select()
      .single();

    if (appError) {
      alert(`신청 실패: ${appError.message}`);
      return;
    }

    const newCurrentMembers = party.current_members + 1;
    const newStatus =
      newCurrentMembers >= party.max_members ? "마감" : "모집중";

    const { error: updateError } = await supabase
      .from("parties")
      .update({
        current_members: newCurrentMembers,
        status: newStatus,
      })
      .eq("id", party.id);

    if (updateError) {
      alert(`인원 업데이트 실패: ${updateError.message}`);
      await loadMainData();
      return;
    }

    if (appData) {
      setApplications((prev) => [...prev, appData as Application]);
    }

    setParties((prev) =>
      prev.map((item) =>
        item.id === party.id
          ? {
              ...item,
              current_members: newCurrentMembers,
              status: newStatus,
            }
          : item
      )
    );
  };

  const handleCancelApply = async (party: Party) => {
    if (!isApproved) {
      alert("관리자 승인 후 신청취소할 수 있어.");
      return;
    }

    if (!currentNickname) {
      alert("로그인 후 신청취소할 수 있어.");
      return;
    }

    if (party.leader === currentNickname) {
      alert("파티장은 신청취소할 수 없어.");
      return;
    }

    const partyApplications = applicationsByParty[party.id] || [];
    const myApplication = partyApplications.find(
      (item) => item.nickname === currentNickname
    );

    if (!myApplication) {
      alert("내 신청 내역이 없어.");
      return;
    }

    const { error: deleteError } = await supabase
      .from("applications")
      .delete()
      .eq("id", myApplication.id);

    if (deleteError) {
      alert(`신청취소 실패: ${deleteError.message}`);
      return;
    }

    const newCurrentMembers = Math.max(1, party.current_members - 1);
    const newStatus =
      newCurrentMembers >= party.max_members ? "마감" : "모집중";

    const { error: updateError } = await supabase
      .from("parties")
      .update({
        current_members: newCurrentMembers,
        status: newStatus,
      })
      .eq("id", party.id);

    if (updateError) {
      alert(`인원 업데이트 실패: ${updateError.message}`);
      await loadMainData();
      return;
    }

    setApplications((prev) => prev.filter((item) => item.id !== myApplication.id));

    setParties((prev) =>
      prev.map((item) =>
        item.id === party.id
          ? {
              ...item,
              current_members: newCurrentMembers,
              status: newStatus,
            }
          : item
      )
    );
  };

  const handleKickMember = async (party: Party, nickname: string) => {
    if (!isApproved) {
      alert("관리자 승인 후 사용할 수 있어.");
      return;
    }

    if (party.leader !== currentNickname) {
      alert("파티장만 신청자를 강퇴할 수 있어.");
      return;
    }

    const partyApplications = applicationsByParty[party.id] || [];
    const target = partyApplications.find((item) => item.nickname === nickname);

    if (!target) {
      alert("해당 신청자를 찾지 못했어.");
      return;
    }

    const ok = confirm(`${nickname} 님을 파티에서 제외할까?`);
    if (!ok) return;

    const { error: deleteError } = await supabase
      .from("applications")
      .delete()
      .eq("id", target.id);

    if (deleteError) {
      alert(`강퇴 실패: ${deleteError.message}`);
      return;
    }

    const newCurrentMembers = Math.max(1, party.current_members - 1);
    const newStatus =
      newCurrentMembers >= party.max_members ? "마감" : "모집중";

    const { error: updateError } = await supabase
      .from("parties")
      .update({
        current_members: newCurrentMembers,
        status: newStatus,
      })
      .eq("id", party.id);

    if (updateError) {
      alert(`인원 업데이트 실패: ${updateError.message}`);
      await loadMainData();
      return;
    }

    setApplications((prev) => prev.filter((item) => item.id !== target.id));

    setParties((prev) =>
      prev.map((item) =>
        item.id === party.id
          ? {
              ...item,
              current_members: newCurrentMembers,
              status: newStatus,
            }
          : item
      )
    );
  };

  if (!authReady || !profileReady) {
    return (
      <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-900 sm:px-6">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm">
          불러오는 중...
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-900 sm:px-6">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold">봄비 길드 보스 매칭</h1>
          <p className="mt-2 text-sm text-zinc-600">
            먼저 회원가입 또는 로그인해줘.
          </p>

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setAuthMode("login")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                authMode === "login"
                  ? "bg-black text-white"
                  : "border border-zinc-300 bg-white"
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                authMode === "signup"
                  ? "bg-black text-white"
                  : "border border-zinc-300 bg-white"
              }`}
            >
              회원가입
            </button>
          </div>

          {authMode === "login" ? (
            <div className="mt-6 space-y-3">
              <input
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                type="email"
                placeholder="이메일"
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none"
              />
              <input
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                type="password"
                placeholder="비밀번호"
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none"
              />
              <button
                onClick={handleLogin}
                disabled={authLoading}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                로그인
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <input
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                type="email"
                placeholder="이메일"
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none"
              />
              <input
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                type="password"
                placeholder="비밀번호"
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none"
              />
              <input
                value={signupNickname}
                onChange={(e) => setSignupNickname(e.target.value)}
                type="text"
                placeholder="사이트 닉네임"
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none"
              />
              <input
                value={signupCharacterName}
                onChange={(e) => setSignupCharacterName(e.target.value)}
                type="text"
                placeholder="메이플 캐릭터명"
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none"
              />
              <input
                value={signupJob}
                onChange={(e) => setSignupJob(e.target.value)}
                type="text"
                placeholder="직업"
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none"
              />
              <button
                onClick={handleSignup}
                disabled={authLoading}
                className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                회원가입
              </button>
            </div>
          )}

          {authMessage && (
            <p className="mt-4 text-sm text-zinc-600">{authMessage}</p>
          )}
        </div>
      </main>
    );
  }

  if (!isApproved && !isAdmin) {
    return (
      <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-900 sm:px-6">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold">봄비 길드 보스 매칭</h1>
          <p className="mt-3 text-sm text-zinc-600">
            가입은 완료됐고, 지금은 관리자 승인 대기 상태야.
          </p>

          <div className="mt-6 rounded-xl bg-zinc-50 p-4 text-sm">
            <p>
              <span className="font-semibold">닉네임:</span> {currentNickname}
            </p>
            <p>
              <span className="font-semibold">캐릭터명:</span>{" "}
              {currentCharacterName || "없음"}
            </p>
            <p>
              <span className="font-semibold">직업:</span> {currentJob || "없음"}
            </p>
            <p className="mt-3 text-zinc-500">길드 관리자에게 승인 요청해줘.</p>
          </div>

          <div className="mt-6">
            <button
              onClick={handleLogout}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium"
            >
              로그아웃
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-4 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">봄비 길드 보스 매칭</h1>
              <p className="mt-2 text-sm text-zinc-600">
                봄비 길드원끼리 파티를 모집하고 신청하는 내부용 사이트
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 lg:items-end">
              <div className="text-sm">
                <p>
                  <span className="font-semibold">닉네임:</span> {currentNickname}
                </p>
                <p>
                  <span className="font-semibold">캐릭터명:</span>{" "}
                  {currentCharacterName || "없음"}
                </p>
                <p>
                  <span className="font-semibold">직업:</span> {currentJob || "없음"}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">관리자 승인 페이지</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  가입 대기 유저를 승인하거나 승인취소할 수 있어.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setAdminTab("pending")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium ${
                    adminTab === "pending"
                      ? "bg-black text-white"
                      : "border border-zinc-300 bg-white"
                  }`}
                >
                  승인 대기 ({pendingUsers.length})
                </button>
                <button
                  onClick={() => setAdminTab("approved")}
                  className={`rounded-xl px-4 py-2 text-sm font-medium ${
                    adminTab === "approved"
                      ? "bg-black text-white"
                      : "border border-zinc-300 bg-white"
                  }`}
                >
                  승인 완료 ({approvedUsers.length})
                </button>
              </div>
            </div>

            <div className="mt-4">
              {adminLoading ? (
                <div className="rounded-xl bg-zinc-50 p-4 text-sm">
                  불러오는 중...
                </div>
              ) : adminTab === "pending" ? (
                pendingUsers.length === 0 ? (
                  <div className="rounded-xl bg-zinc-50 p-4 text-sm">
                    승인 대기 유저가 없어.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingUsers.map((guildUser) => (
                      <div
                        key={guildUser.id}
                        className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="text-sm">
                          <p>
                            <span className="font-semibold">닉네임:</span>{" "}
                            {guildUser.nickname || "없음"}
                          </p>
                          <p>
                            <span className="font-semibold">캐릭터명:</span>{" "}
                            {guildUser.character_name || "없음"}
                          </p>
                          <p>
                            <span className="font-semibold">직업:</span>{" "}
                            {guildUser.job || "없음"}
                          </p>
                        </div>

                        <button
                          onClick={() => handleApproveUser(guildUser.id)}
                          className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
                        >
                          승인하기
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : approvedUsers.length === 0 ? (
                <div className="rounded-xl bg-zinc-50 p-4 text-sm">
                  승인 완료 유저가 없어.
                </div>
              ) : (
                <div className="space-y-3">
                  {approvedUsers.map((guildUser) => (
                    <div
                      key={guildUser.id}
                      className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="text-sm">
                        <p>
                          <span className="font-semibold">닉네임:</span>{" "}
                          {guildUser.nickname || "없음"}
                        </p>
                        <p>
                          <span className="font-semibold">캐릭터명:</span>{" "}
                          {guildUser.character_name || "없음"}
                        </p>
                        <p>
                          <span className="font-semibold">직업:</span>{" "}
                          {guildUser.job || "없음"}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRevokeUser(guildUser.id)}
                        className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium"
                      >
                        승인취소
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-semibold">모집글 작성</h2>
          <p className="mt-2 text-sm text-zinc-600">
            파티장은 로그인한 닉네임으로 자동 등록돼.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <input
              value={boss}
              onChange={(e) => setBoss(e.target.value)}
              type="text"
              placeholder="보스명"
              className="rounded-xl border border-zinc-300 px-4 py-3 outline-none"
            />
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
              className="rounded-xl border border-zinc-300 px-4 py-3 outline-none"
            />
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-xl border border-zinc-300 px-4 py-3 outline-none"
            >
              <option value="">시간 선택</option>
              {timeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <input
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              type="number"
              placeholder="최대 인원"
              className="rounded-xl border border-zinc-300 px-4 py-3 outline-none"
            />
            <input
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              type="text"
              placeholder="조건 (예: 환산 500000이상 / 비율 35% 이상)"
              className="rounded-xl border border-zinc-300 px-4 py-3 outline-none md:col-span-2"
            />
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모 (예: 트라이팟 / 디코 가능자)"
              rows={4}
              className="rounded-xl border border-zinc-300 px-4 py-3 outline-none md:col-span-2"
            />
          </div>

          <div className="mt-4">
            <button
              onClick={handleAddParty}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
            >
              모집글 등록
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold">필터 / 정렬</h2>
              <p className="mt-1 text-sm text-zinc-600">
                보스, 상태, 정렬 기준으로 보기 쉽게 정리할 수 있어.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                value={bossFilter}
                onChange={(e) => setBossFilter(e.target.value)}
                className="rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none"
              >
                <option value="all">전체 보스</option>
                {bossOptions.map((bossName) => (
                  <option key={bossName} value={bossName}>
                    {bossName}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none"
              >
                <option value="all">전체 상태</option>
                <option value="모집중">모집중</option>
                <option value="마감">마감</option>
              </select>

              <select
                value={sortOption}
                onChange={(e) =>
                  setSortOption(e.target.value as "latest" | "dateAsc" | "dateDesc")
                }
                className="rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none"
              >
                <option value="latest">최신 등록순</option>
                <option value="dateAsc">날짜 빠른순</option>
                <option value="dateDesc">날짜 늦은순</option>
              </select>

              <button
                onClick={() => {
                  setBossFilter("all");
                  setStatusFilter("all");
                  setSortOption("latest");
                }}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium"
              >
                필터 초기화
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">현재 모집 중인 파티</h2>
          <span className="text-sm text-zinc-500">총 {filteredParties.length}개</span>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">불러오는 중...</div>
        ) : filteredParties.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            조건에 맞는 모집글이 없어.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredParties.map((party) => {
              const partyApplications = applicationsByParty[party.id] || [];
              const memberNames = [
                party.leader,
                ...partyApplications.map((a) => a.nickname),
              ];

              const isLeader = currentNickname === party.leader;
              const alreadyApplied = partyApplications.some(
                (a) => a.nickname === currentNickname
              );

              return (
                <div
                  key={party.id}
                  className="rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold">{party.boss}</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        파티장: {party.leader}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        party.status === "모집중"
                          ? "bg-green-100 text-green-700"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {party.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-zinc-700">
                    <p>날짜: {party.date}</p>
                    <p>시간: {formatTime(party.time)}</p>
                    <p>
                      인원: {party.current_members} / {party.max_members}
                    </p>
                    <p>조건: {party.condition || "없음"}</p>
                    <p>메모: {party.memo || "없음"}</p>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold">신청자 목록</p>
                    <div className="flex flex-wrap gap-2">
                      {memberNames.map((name, index) => {
                        const removable = isLeader && name !== party.leader;

                        return (
                          <div
                            key={`${name}-${index}`}
                            className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700"
                          >
                            <span>{name}</span>
                            {removable && (
                              <button
                                onClick={() => handleKickMember(party, name)}
                                className="ml-1 rounded-full px-1 text-[10px] font-bold text-red-500 hover:bg-red-50"
                                title="강퇴"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleApply(party)}
                      disabled={isLeader || alreadyApplied}
                      className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                    >
                      신청하기
                    </button>
                    <button
                      onClick={() => handleCancelApply(party)}
                      disabled={isLeader || !alreadyApplied}
                      className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-40"
                    >
                      신청취소
                    </button>
                    {isLeader && (
                      <button
                        onClick={() => handleDeleteParty(party)}
                        className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600"
                      >
                        모집글 삭제
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}