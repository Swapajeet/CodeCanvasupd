# Security Specification - Code Canvas

## 1. Data Invariants
- A room must have a name (optional in some flows, but usually files are present).
- Messages must have a sender and text.
- User profiles can only be edited by the owner.
- Room code edits are currently handled by the backend (server-side admin), so rules only need to allow backend writes or verified users for some ops.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)
1. **Identity Spoofing**: Attempt to post a message as another user ID.
2. **Room Takeover**: Attempt to delete a room document you didn't create.
3. **Shadow Field Injection**: Adding `isAdmin: true` to a user profile.
4. **Large Payload Attack**: Sending a 10MB string as a message text.
5. **Path Poisoning**: Using `../` or special characters in room ID.
6. **Orphaned Message**: Creating a message for a non-existent room.
7. **Timestamp Spoofing**: Setting `updatedAt` to a future date instead of server time.
8. **Unauthenticated Read**: Reading user private info without signing in.
9. **Bulk Scrape**: Querying all rooms without filters.
10. **Type Mismatch**: Sending a boolean for the `files` object.
11. **Immutable Field Change**: Trying to change the `createdAt` of a room (if it existed).
12. **Denial of Wallet**: Infinite recursion or expensive get() calls in rules.

## 3. Test Runner (Mock)
- We will verify that authenticated users can only write to their own `/users/{userId}`.
- We will verify that `/rooms/{roomId}` has basic validation.
