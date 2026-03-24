# Seed Data for DSA Tracker

Create these 4 files in the `data/` directory.

## `data/problems.json`

```json
[
  {"id":1,"title":"Two Sum","difficulty":"Easy","url":"https://leetcode.com/problems/two-sum/","companies":["Google","Amazon","Meta","Apple","Microsoft"]},
  {"id":2,"title":"Add Two Numbers","difficulty":"Medium","url":"https://leetcode.com/problems/add-two-numbers/","companies":["Amazon","Microsoft"]},
  {"id":3,"title":"Longest Substring Without Repeating Characters","difficulty":"Medium","url":"https://leetcode.com/problems/longest-substring-without-repeating-characters/","companies":["Amazon","Google","Meta"]},
  {"id":4,"title":"Median of Two Sorted Arrays","difficulty":"Hard","url":"https://leetcode.com/problems/median-of-two-sorted-arrays/","companies":["Google","Amazon"]},
  {"id":5,"title":"Longest Palindromic Substring","difficulty":"Medium","url":"https://leetcode.com/problems/longest-palindromic-substring/","companies":["Amazon","Microsoft"]},
  {"id":11,"title":"Container With Most Water","difficulty":"Medium","url":"https://leetcode.com/problems/container-with-most-water/","companies":["Amazon","Google"]},
  {"id":15,"title":"3Sum","difficulty":"Medium","url":"https://leetcode.com/problems/3sum/","companies":["Amazon","Meta","Google"]},
  {"id":17,"title":"Letter Combinations of a Phone Number","difficulty":"Medium","url":"https://leetcode.com/problems/letter-combinations-of-a-phone-number/","companies":["Amazon","Google"]},
  {"id":19,"title":"Remove Nth Node From End of List","difficulty":"Medium","url":"https://leetcode.com/problems/remove-nth-node-from-end-of-list/","companies":["Meta","Amazon"]},
  {"id":20,"title":"Valid Parentheses","difficulty":"Easy","url":"https://leetcode.com/problems/valid-parentheses/","companies":["Amazon","Google","Meta"]},
  {"id":21,"title":"Merge Two Sorted Lists","difficulty":"Easy","url":"https://leetcode.com/problems/merge-two-sorted-lists/","companies":["Amazon","Microsoft"]},
  {"id":23,"title":"Merge k Sorted Lists","difficulty":"Hard","url":"https://leetcode.com/problems/merge-k-sorted-lists/","companies":["Amazon","Meta","Google"]},
  {"id":33,"title":"Search in Rotated Sorted Array","difficulty":"Medium","url":"https://leetcode.com/problems/search-in-rotated-sorted-array/","companies":["Amazon","Meta","Google"]},
  {"id":39,"title":"Combination Sum","difficulty":"Medium","url":"https://leetcode.com/problems/combination-sum/","companies":["Amazon"]},
  {"id":42,"title":"Trapping Rain Water","difficulty":"Hard","url":"https://leetcode.com/problems/trapping-rain-water/","companies":["Amazon","Google","Meta"]},
  {"id":46,"title":"Permutations","difficulty":"Medium","url":"https://leetcode.com/problems/permutations/","companies":["Amazon","Meta"]},
  {"id":48,"title":"Rotate Image","difficulty":"Medium","url":"https://leetcode.com/problems/rotate-image/","companies":["Amazon","Microsoft"]},
  {"id":49,"title":"Group Anagrams","difficulty":"Medium","url":"https://leetcode.com/problems/group-anagrams/","companies":["Amazon","Google"]},
  {"id":53,"title":"Maximum Subarray","difficulty":"Medium","url":"https://leetcode.com/problems/maximum-subarray/","companies":["Amazon","Google","Microsoft"]},
  {"id":55,"title":"Jump Game","difficulty":"Medium","url":"https://leetcode.com/problems/jump-game/","companies":["Amazon"]},
  {"id":56,"title":"Merge Intervals","difficulty":"Medium","url":"https://leetcode.com/problems/merge-intervals/","companies":["Amazon","Google","Meta"]},
  {"id":70,"title":"Climbing Stairs","difficulty":"Easy","url":"https://leetcode.com/problems/climbing-stairs/","companies":["Amazon","Google"]},
  {"id":72,"title":"Edit Distance","difficulty":"Medium","url":"https://leetcode.com/problems/edit-distance/","companies":["Amazon"]},
  {"id":73,"title":"Set Matrix Zeroes","difficulty":"Medium","url":"https://leetcode.com/problems/set-matrix-zeroes/","companies":["Amazon","Microsoft"]},
  {"id":76,"title":"Minimum Window Substring","difficulty":"Hard","url":"https://leetcode.com/problems/minimum-window-substring/","companies":["Meta","Amazon","Google"]},
  {"id":78,"title":"Subsets","difficulty":"Medium","url":"https://leetcode.com/problems/subsets/","companies":["Amazon","Meta"]},
  {"id":79,"title":"Word Search","difficulty":"Medium","url":"https://leetcode.com/problems/word-search/","companies":["Amazon","Microsoft"]},
  {"id":98,"title":"Validate Binary Search Tree","difficulty":"Medium","url":"https://leetcode.com/problems/validate-binary-search-tree/","companies":["Amazon","Meta"]},
  {"id":100,"title":"Same Tree","difficulty":"Easy","url":"https://leetcode.com/problems/same-tree/","companies":["Amazon"]},
  {"id":102,"title":"Binary Tree Level Order Traversal","difficulty":"Medium","url":"https://leetcode.com/problems/binary-tree-level-order-traversal/","companies":["Amazon","Meta"]},
  {"id":104,"title":"Maximum Depth of Binary Tree","difficulty":"Easy","url":"https://leetcode.com/problems/maximum-depth-of-binary-tree/","companies":["Amazon","Google"]},
  {"id":121,"title":"Best Time to Buy and Sell Stock","difficulty":"Easy","url":"https://leetcode.com/problems/best-time-to-buy-and-sell-stock/","companies":["Amazon","Google","Meta"]},
  {"id":124,"title":"Binary Tree Maximum Path Sum","difficulty":"Hard","url":"https://leetcode.com/problems/binary-tree-maximum-path-sum/","companies":["Meta","Google"]},
  {"id":125,"title":"Valid Palindrome","difficulty":"Easy","url":"https://leetcode.com/problems/valid-palindrome/","companies":["Meta","Amazon"]},
  {"id":128,"title":"Longest Consecutive Sequence","difficulty":"Medium","url":"https://leetcode.com/problems/longest-consecutive-sequence/","companies":["Amazon","Google"]},
  {"id":133,"title":"Clone Graph","difficulty":"Medium","url":"https://leetcode.com/problems/clone-graph/","companies":["Meta","Amazon"]},
  {"id":136,"title":"Single Number","difficulty":"Easy","url":"https://leetcode.com/problems/single-number/","companies":["Amazon"]},
  {"id":138,"title":"Copy List with Random Pointer","difficulty":"Medium","url":"https://leetcode.com/problems/copy-list-with-random-pointer/","companies":["Amazon","Meta"]},
  {"id":139,"title":"Word Break","difficulty":"Medium","url":"https://leetcode.com/problems/word-break/","companies":["Amazon","Google","Meta"]},
  {"id":141,"title":"Linked List Cycle","difficulty":"Easy","url":"https://leetcode.com/problems/linked-list-cycle/","companies":["Amazon","Microsoft"]},
  {"id":143,"title":"Reorder List","difficulty":"Medium","url":"https://leetcode.com/problems/reorder-list/","companies":["Amazon"]},
  {"id":146,"title":"LRU Cache","difficulty":"Medium","url":"https://leetcode.com/problems/lru-cache/","companies":["Amazon","Google","Meta","Microsoft"]},
  {"id":152,"title":"Maximum Product Subarray","difficulty":"Medium","url":"https://leetcode.com/problems/maximum-product-subarray/","companies":["Amazon","Google"]},
  {"id":153,"title":"Find Minimum in Rotated Sorted Array","difficulty":"Medium","url":"https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/","companies":["Amazon","Microsoft"]},
  {"id":167,"title":"Two Sum II - Input Array Is Sorted","difficulty":"Medium","url":"https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/","companies":["Amazon"]},
  {"id":190,"title":"Reverse Bits","difficulty":"Easy","url":"https://leetcode.com/problems/reverse-bits/","companies":["Amazon"]},
  {"id":191,"title":"Number of 1 Bits","difficulty":"Easy","url":"https://leetcode.com/problems/number-of-1-bits/","companies":["Amazon"]},
  {"id":198,"title":"House Robber","difficulty":"Medium","url":"https://leetcode.com/problems/house-robber/","companies":["Amazon","Google"]},
  {"id":200,"title":"Number of Islands","difficulty":"Medium","url":"https://leetcode.com/problems/number-of-islands/","companies":["Amazon","Google","Meta"]},
  {"id":206,"title":"Reverse Linked List","difficulty":"Easy","url":"https://leetcode.com/problems/reverse-linked-list/","companies":["Amazon","Microsoft","Google"]},
  {"id":207,"title":"Course Schedule","difficulty":"Medium","url":"https://leetcode.com/problems/course-schedule/","companies":["Amazon","Google"]},
  {"id":208,"title":"Implement Trie (Prefix Tree)","difficulty":"Medium","url":"https://leetcode.com/problems/implement-trie-prefix-tree/","companies":["Amazon","Google"]},
  {"id":210,"title":"Course Schedule II","difficulty":"Medium","url":"https://leetcode.com/problems/course-schedule-ii/","companies":["Amazon","Google"]},
  {"id":211,"title":"Design Add and Search Words Data Structure","difficulty":"Medium","url":"https://leetcode.com/problems/design-add-and-search-words-data-structure/","companies":["Amazon"]},
  {"id":212,"title":"Word Search II","difficulty":"Hard","url":"https://leetcode.com/problems/word-search-ii/","companies":["Amazon","Google"]},
  {"id":213,"title":"House Robber II","difficulty":"Medium","url":"https://leetcode.com/problems/house-robber-ii/","companies":["Amazon"]},
  {"id":217,"title":"Contains Duplicate","difficulty":"Easy","url":"https://leetcode.com/problems/contains-duplicate/","companies":["Amazon"]},
  {"id":226,"title":"Invert Binary Tree","difficulty":"Easy","url":"https://leetcode.com/problems/invert-binary-tree/","companies":["Google","Amazon"]},
  {"id":230,"title":"Kth Smallest Element in a BST","difficulty":"Medium","url":"https://leetcode.com/problems/kth-smallest-element-in-a-bst/","companies":["Amazon"]},
  {"id":235,"title":"Lowest Common Ancestor of a Binary Search Tree","difficulty":"Medium","url":"https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/","companies":["Amazon","Meta"]},
  {"id":238,"title":"Product of Array Except Self","difficulty":"Medium","url":"https://leetcode.com/problems/product-of-array-except-self/","companies":["Amazon","Meta","Google"]},
  {"id":239,"title":"Sliding Window Maximum","difficulty":"Hard","url":"https://leetcode.com/problems/sliding-window-maximum/","companies":["Amazon","Google"]},
  {"id":242,"title":"Valid Anagram","difficulty":"Easy","url":"https://leetcode.com/problems/valid-anagram/","companies":["Amazon"]},
  {"id":252,"title":"Meeting Rooms","difficulty":"Easy","url":"https://leetcode.com/problems/meeting-rooms/","companies":["Amazon","Google"]},
  {"id":253,"title":"Meeting Rooms II","difficulty":"Medium","url":"https://leetcode.com/problems/meeting-rooms-ii/","companies":["Amazon","Google","Meta"]},
  {"id":261,"title":"Graph Valid Tree","difficulty":"Medium","url":"https://leetcode.com/problems/graph-valid-tree/","companies":["Amazon","Google"]},
  {"id":268,"title":"Missing Number","difficulty":"Easy","url":"https://leetcode.com/problems/missing-number/","companies":["Amazon"]},
  {"id":269,"title":"Alien Dictionary","difficulty":"Hard","url":"https://leetcode.com/problems/alien-dictionary/","companies":["Amazon","Google","Meta"]},
  {"id":271,"title":"Encode and Decode Strings","difficulty":"Medium","url":"https://leetcode.com/problems/encode-and-decode-strings/","companies":["Google"]},
  {"id":286,"title":"Walls and Gates","difficulty":"Medium","url":"https://leetcode.com/problems/walls-and-gates/","companies":["Meta","Google"]},
  {"id":295,"title":"Find Median from Data Stream","difficulty":"Hard","url":"https://leetcode.com/problems/find-median-from-data-stream/","companies":["Amazon","Google"]},
  {"id":297,"title":"Serialize and Deserialize Binary Tree","difficulty":"Hard","url":"https://leetcode.com/problems/serialize-and-deserialize-binary-tree/","companies":["Amazon","Meta","Google"]},
  {"id":300,"title":"Longest Increasing Subsequence","difficulty":"Medium","url":"https://leetcode.com/problems/longest-increasing-subsequence/","companies":["Amazon","Google"]},
  {"id":322,"title":"Coin Change","difficulty":"Medium","url":"https://leetcode.com/problems/coin-change/","companies":["Amazon","Google"]},
  {"id":323,"title":"Number of Connected Components in an Undirected Graph","difficulty":"Medium","url":"https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/","companies":["Amazon","Google"]},
  {"id":338,"title":"Counting Bits","difficulty":"Easy","url":"https://leetcode.com/problems/counting-bits/","companies":["Amazon"]},
  {"id":347,"title":"Top K Frequent Elements","difficulty":"Medium","url":"https://leetcode.com/problems/top-k-frequent-elements/","companies":["Amazon","Google"]},
  {"id":371,"title":"Sum of Two Integers","difficulty":"Medium","url":"https://leetcode.com/problems/sum-of-two-integers/","companies":["Amazon"]},
  {"id":417,"title":"Pacific Atlantic Water Flow","difficulty":"Medium","url":"https://leetcode.com/problems/pacific-atlantic-water-flow/","companies":["Amazon","Google"]},
  {"id":424,"title":"Longest Repeating Character Replacement","difficulty":"Medium","url":"https://leetcode.com/problems/longest-repeating-character-replacement/","companies":["Google"]},
  {"id":435,"title":"Non-overlapping Intervals","difficulty":"Medium","url":"https://leetcode.com/problems/non-overlapping-intervals/","companies":["Amazon"]},
  {"id":572,"title":"Subtree of Another Tree","difficulty":"Easy","url":"https://leetcode.com/problems/subtree-of-another-tree/","companies":["Amazon"]},
  {"id":647,"title":"Palindromic Substrings","difficulty":"Medium","url":"https://leetcode.com/problems/palindromic-substrings/","companies":["Amazon","Meta"]},
  {"id":695,"title":"Max Area of Island","difficulty":"Medium","url":"https://leetcode.com/problems/max-area-of-island/","companies":["Amazon","Google"]},
  {"id":703,"title":"Kth Largest Element in a Stream","difficulty":"Easy","url":"https://leetcode.com/problems/kth-largest-element-in-a-stream/","companies":["Amazon"]},
  {"id":743,"title":"Network Delay Time","difficulty":"Medium","url":"https://leetcode.com/problems/network-delay-time/","companies":["Amazon","Google"]},
  {"id":746,"title":"Min Cost Climbing Stairs","difficulty":"Easy","url":"https://leetcode.com/problems/min-cost-climbing-stairs/","companies":["Amazon"]},
  {"id":994,"title":"Rotting Oranges","difficulty":"Medium","url":"https://leetcode.com/problems/rotting-oranges/","companies":["Amazon","Google"]},
  {"id":1143,"title":"Longest Common Subsequence","difficulty":"Medium","url":"https://leetcode.com/problems/longest-common-subsequence/","companies":["Amazon","Google"]}
]
```

## `data/topics.json`

```json
[
  {"id":"arrays","name":"Arrays","description":"Linear data structure for storing elements","prerequisites":[],"problemIds":[1,11,15,42,48,49,53,55,56,73,121,128,152,167,217,238,239,252,253,271,347,435],"order":1},
  {"id":"strings","name":"Strings","description":"Character sequences and manipulation","prerequisites":[],"problemIds":[3,5,49,76,125,242,271,424,647],"order":2},
  {"id":"linked-lists","name":"Linked Lists","description":"Sequential nodes connected by pointers","prerequisites":["arrays"],"problemIds":[2,19,21,23,138,141,143,206],"order":3},
  {"id":"stacks","name":"Stacks","description":"LIFO data structure","prerequisites":["arrays"],"problemIds":[20,42,239],"order":4},
  {"id":"queues","name":"Queues","description":"FIFO data structure","prerequisites":["arrays"],"problemIds":[239,286,994],"order":5},
  {"id":"hash-maps","name":"Hash Maps","description":"Key-value pair storage with O(1) lookup","prerequisites":["arrays"],"problemIds":[1,3,49,128,136,146,217,242,347],"order":6},
  {"id":"trees","name":"Trees","description":"Hierarchical node-based data structure","prerequisites":["linked-lists","stacks","queues"],"problemIds":[98,100,102,104,124,226,230,235,297,572],"order":7},
  {"id":"heaps","name":"Heaps / Priority Queues","description":"Complete binary tree maintaining heap property","prerequisites":["trees"],"problemIds":[23,253,295,347,703],"order":8},
  {"id":"graphs","name":"Graphs","description":"Nodes connected by edges","prerequisites":["trees","hash-maps"],"problemIds":[133,200,207,210,261,269,286,323,417,695,743,994],"order":9},
  {"id":"tries","name":"Tries","description":"Tree-like structure for string prefix operations","prerequisites":["trees"],"problemIds":[208,211,212],"order":10},
  {"id":"union-find","name":"Union-Find","description":"Disjoint set data structure","prerequisites":["graphs"],"problemIds":[128,261,323],"order":11},
  {"id":"matrices","name":"Matrices","description":"2D array operations","prerequisites":["arrays"],"problemIds":[48,73,79,200,286,417,695,994],"order":12},
  {"id":"binary-search","name":"Binary Search","description":"Divide-and-conquer search on sorted data","prerequisites":["arrays"],"problemIds":[4,33,153,167,300],"order":13},
  {"id":"dynamic-programming","name":"Dynamic Programming","description":"Optimization via overlapping subproblems","prerequisites":["arrays","binary-search"],"problemIds":[5,53,55,70,72,121,139,152,198,213,300,322,647,746,1143],"order":14},
  {"id":"bit-manipulation","name":"Bit Manipulation","description":"Operations on binary representations","prerequisites":["arrays"],"problemIds":[136,190,191,268,338,371],"order":15}
]
```

## `data/sheets.json`

```json
[
  {"id":"blind-75","name":"Blind 75","url":"https://neetcode.io/practice","problemIds":[1,3,5,11,15,19,20,21,23,33,39,42,46,48,49,53,55,56,70,72,73,76,78,79,98,100,102,104,121,124,125,128,133,136,138,139,141,143,146,152,153,190,191,198,200,206,207,208,211,212,213,217,226,230,235,238,242,252,253,261,268,269,271,295,297,300,322,323,338,347,371,417,424,435,572,647]},
  {"id":"neetcode-150","name":"NeetCode 150","url":"https://neetcode.io/practice","problemIds":[1,3,4,5,11,15,17,19,20,21,23,33,39,42,46,48,49,53,55,56,70,72,73,76,78,79,98,100,102,104,121,124,125,128,133,136,138,139,141,143,146,152,153,167,190,191,198,200,206,207,208,210,211,212,213,217,226,230,235,238,239,242,253,261,268,269,271,295,297,300,322,323,338,347,371,417,424,435,572,647,695,703,743,746,994,1143]},
  {"id":"striver-sde","name":"Striver's SDE Sheet","url":"https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/","problemIds":[1,2,3,15,20,21,23,42,46,48,49,53,56,73,76,78,79,98,102,104,121,124,128,133,136,138,139,141,143,146,152,198,200,206,207,210,226,230,235,238,297,300,322,347]},
  {"id":"grind-75","name":"Grind 75","url":"https://www.techinterviewhandbook.org/grind75/","problemIds":[1,3,5,11,15,20,21,33,39,42,46,49,53,56,70,76,78,98,102,104,121,124,125,128,133,139,141,146,200,206,207,208,226,230,235,238,242,295,297,300,322,347]},
  {"id":"leetcode-top-150","name":"LeetCode Top Interview 150","url":"https://leetcode.com/studyplan/top-interview-150/","problemIds":[1,2,3,4,5,11,15,17,19,20,21,33,42,46,48,49,53,55,56,70,72,73,76,78,79,98,102,104,121,124,125,128,133,136,138,139,141,146,152,153,167,190,191,198,200,206,207,208,210,212,217,226,230,238,242,268,295,297,300,322,347]}
]
```

## `data/patterns.json`

```json
[
  {"id":"two-pointers","name":"Two Pointers","description":"Use two pointers to traverse from different positions","problemIds":[1,11,15,42,125,141,143,167]},
  {"id":"sliding-window","name":"Sliding Window","description":"Maintain a window that slides over data","problemIds":[3,76,239,424]},
  {"id":"fast-slow-pointers","name":"Fast & Slow Pointers","description":"Two pointers moving at different speeds","problemIds":[19,141,143]},
  {"id":"merge-intervals","name":"Merge Intervals","description":"Handle overlapping intervals","problemIds":[56,252,253,435]},
  {"id":"binary-search-pattern","name":"Modified Binary Search","description":"Binary search variations on sorted/rotated data","problemIds":[4,33,153,167,300]},
  {"id":"bfs","name":"BFS","description":"Breadth-first search for level-order traversal","problemIds":[102,200,286,994]},
  {"id":"dfs","name":"DFS","description":"Depth-first search for tree/graph traversal","problemIds":[79,98,100,104,124,133,200,207,210,226,235,297,417,572,695]},
  {"id":"backtracking","name":"Backtracking","description":"Explore all candidates and backtrack on invalid paths","problemIds":[17,39,46,78,79,212]},
  {"id":"dynamic-programming-pattern","name":"Dynamic Programming","description":"Solve by combining solutions to subproblems","problemIds":[5,53,55,70,72,121,139,152,198,213,300,322,647,746,1143]},
  {"id":"greedy","name":"Greedy","description":"Make locally optimal choices","problemIds":[55,121,435]},
  {"id":"top-k","name":"Top-K Elements","description":"Find top/bottom K elements using heaps","problemIds":[23,295,347,703]},
  {"id":"topological-sort","name":"Topological Sort","description":"Linear ordering of vertices in a DAG","problemIds":[207,210,269]},
  {"id":"bit-manipulation-pattern","name":"Bit Manipulation","description":"Use bitwise operations for efficient computation","problemIds":[136,190,191,268,338,371]},
  {"id":"monotonic-stack","name":"Monotonic Stack/Queue","description":"Stack/queue maintaining monotonic order","problemIds":[42,239]},
  {"id":"trie-pattern","name":"Trie","description":"Prefix tree operations","problemIds":[208,211,212]},
  {"id":"union-find-pattern","name":"Union-Find","description":"Disjoint set operations for connectivity","problemIds":[128,261,323]},
  {"id":"divide-conquer","name":"Divide & Conquer","description":"Break problem into smaller subproblems","problemIds":[4,23,53]},
  {"id":"subsets-pattern","name":"Subsets","description":"Generate all subsets/combinations","problemIds":[39,46,78]}
]
```
