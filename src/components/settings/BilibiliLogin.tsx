import { useState } from "react";
import { Copy, LogOut, User, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { SettingItem } from "./SettingItem";
import { IS_NATIVE } from "@/lib/api/config";
import { openBilibiliLogin, clearBilibiliCookies } from "@/plugins/webview-login";
import { getBilibiliUserByCookie } from "@/lib/bilibili/bilibili-auth";
import { useBilibiliStore } from "@/store/bilibili-store";
import { writeClipboardText } from "@/lib/clipboard";
import toast from "react-hot-toast";

export function BilibiliLogin() {
  const { user, setLogin, logout } = useBilibiliStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!IS_NATIVE) return null;

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await openBilibiliLogin();
      if (!result?.cookie) return;

      const profile = await getBilibiliUserByCookie(result.cookie);
      if (!profile) {
        toast.error("Cookie 无效或已过期");
        return;
      }
      setLogin(result.cookie, profile);
      setOpen(false);
      toast.success("B 站登录成功");
    } catch {
      toast.error("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (!window.confirm("确定要退出 B 站登录吗？")) return;
    // 后台清除残留 cookie，不阻塞退出流程
    clearBilibiliCookies().catch(() => {});
    logout();
    setOpen(false);
    toast.success("已退出 B 站登录");
  };

  const handleCopyCookie = async () => {
    const ok = await writeClipboardText(useBilibiliStore.getState().cookie);
    if (ok) {
      toast.success("已复制 Cookie");
      setOpen(false);
    } else {
      toast.error("复制失败");
    }
  };

  return (
    <>
      <SettingItem
        icon={User}
        title="B 站账号"
        subtitle={user ? user.uname : "登录后支持获取 B 站 UP 主上传字幕"}
        action={
          user ? (
            <Avatar
              className="h-10 w-10 cursor-pointer transition-opacity hover:opacity-80"
              onClick={() => setOpen(true)}
            >
              {user.face ? <AvatarImage src={user.face} /> : null}
              <AvatarFallback>{user.uname?.[0] || "B"}</AvatarFallback>
            </Avatar>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登录
            </Button>
          )
        }
      />

      <Drawer
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
        }}
      >
        <DrawerContent>
          <DrawerHeader className="px-4 text-center">
            <DrawerTitle>{user?.uname || "B 站账号"}</DrawerTitle>
            <DrawerDescription>账号已登录</DrawerDescription>
          </DrawerHeader>

          <div className="space-y-4 px-6 pb-8">
            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                className="h-11 w-full justify-center"
                onClick={handleCopyCookie}
              >
                <Copy className="mr-2 h-4 w-4" />
                复制 Cookie
              </Button>
              <Button
                variant="destructive"
                className="h-11 w-full justify-center"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
