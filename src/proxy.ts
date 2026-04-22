import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      // return true ถ้าต้องการให้เข้าถึงหน้า
      return !!token;
    },
  },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
