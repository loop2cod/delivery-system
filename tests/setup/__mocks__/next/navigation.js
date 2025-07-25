// Mock for Next.js App Router navigation hooks
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn()
};

const mockPathname = '/';
const mockSearchParams = new URLSearchParams();

module.exports = {
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
  useParams: () => ({}),
  redirect: jest.fn(),
  notFound: jest.fn()
};