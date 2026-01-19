import { crawlX } from '../src/lib/crawlers/x.js';

console.log('X 크롤러 테스트 (limit=2)\n');

// DB 저장 없이 테스트
const result = await crawlX({ limit: 2 });

console.log('\n=== 결과 ===');
console.log(JSON.stringify(result, null, 2));
