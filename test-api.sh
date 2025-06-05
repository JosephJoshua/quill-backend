# ==================================
# == Users ==
# ==================================

echo "\n[Users] Getting My Profile..."
curl -X GET \
  "$BASE_URL/users/me" \
  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n---"

echo "\n[Users] Updating My Profile..."
curl -X PUT \
  "$BASE_URL/users/me" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Curl User"
  }'

echo "\n============================================="

# ==================================
# == Content ==
# ==================================

echo "\n[Content] Uploading Content (Replace 'path/to/your/file.pdf' and metadata)..."
# NOTE: Create a dummy file for testing if needed: echo "This is test content." > test.txt
curl -X POST \
  "$BASE_URL/content/upload" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -F "file=@path/to/your/file.pdf" \
  -F "title=My Uploaded Book" \
  -F "author=Test Author" \
  -F "language=en" \
  -F "genre=Testing" \
  -F "description=Uploaded via curl."
# **ACTION**: Copy the 'id' from the response and run: export CONTENT_ID="PASTE_ID_HERE"

echo "\n---"

echo "\n[Content] Getting User Content List..."
curl -X GET \
  "$BASE_URL/content" \
  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n---"

echo "\n[Content] Getting Specific Content (ID: $CONTENT_ID)..."
curl -X GET \
  "$BASE_URL/content/$CONTENT_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n---"

# echo "\n[Content] Deleting Content (ID: $CONTENT_ID)..." # Uncomment to test delete
# curl -X DELETE \
#  "$BASE_URL/content/$CONTENT_ID" \
#  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n============================================="

# ==================================
# == AI ==
# ==================================

echo "\n[AI] Chat Interaction (without context/history)..."
curl -X POST \
  "$BASE_URL/ai/chat" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain the concept of spaced repetition."
  }'
# **ACTION**: Copy 'dialogueId' from response if testing history: export DIALOGUE_ID="PASTE_ID_HERE"

echo "\n---"

echo "\n[AI] Chat Interaction (with context from CONTENT_ID: $CONTENT_ID)..."
curl -X POST \
  "$BASE_URL/ai/chat" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the main points mentioned about the protagonist in this text?",
    "contentId": "'"$CONTENT_ID"'"
  }'
# **ACTION**: Copy 'dialogueId' from response if testing history: export DIALOGUE_ID="PASTE_ID_HERE"

echo "\n---"

echo "\n[AI] Chat Interaction (with history using DIALOGUE_ID: $DIALOGUE_ID)..."
curl -X POST \
  "$BASE_URL/ai/chat" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me more about the previous point.",
    "previousDialogueId": "'"$DIALOGUE_ID"'"
  }'

echo "\n---"

echo "\n[AI] Generate Flashcards (using CONTENT_ID: $CONTENT_ID)..."
curl -X POST \
  "$BASE_URL/ai/generate/flashcards" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "'"$CONTENT_ID"'",
    "topic": "Key Terms",
    "count": 3,
    "difficulty": "beginner"
  }'

echo "\n---"

echo "\n[AI] Generate Quiz (using CONTENT_ID: $CONTENT_ID)..."
curl -X POST \
  "$BASE_URL/ai/generate/quiz" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "'"$CONTENT_ID"'",
    "topic": "Main Events",
    "questionCount": 2,
    "difficulty": "intermediate",
    "questionTypes": ["multiple-choice"]
  }'

echo "\n---"

echo "\n[AI] Analyze Text Snippet (Explain)..."
curl -X POST \
  "$BASE_URL/ai/analyze/text" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "The chiaroscuro lighting emphasized the dramatic tension.",
    "analysisType": "explain",
    "context": "From a film review."
  }'

echo "\n---"

echo "\n[AI] Analyze Text Snippet (Grammar)..."
curl -X POST \
  "$BASE_URL/ai/analyze/text" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "He go to the store yesterday buy apples.",
    "analysisType": "grammar"
  }'

echo "\n============================================="

# ==================================
# == Learning (Flashcards) ==
# ==================================

echo "\n[Learning] Creating Flashcard..."
curl -X POST \
  "$BASE_URL/learning/flashcards" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "frontText": "Chiaroscuro",
    "backText": "An effect of contrasted light and shadow created by light falling unevenly or from a particular direction on something.",
    "contentId": "'"$CONTENT_ID"'",
    "tags": ["art", "lighting"]
  }'
# **ACTION**: Copy 'id' from response: export FLASHCARD_ID="PASTE_ID_HERE"

echo "\n---"

echo "\n[Learning] Getting User Flashcards..."
curl -X GET \
  "$BASE_URL/learning/flashcards" \
  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n---"

echo "\n[Learning] Getting User Flashcards (Filtered by CONTENT_ID: $CONTENT_ID)..."
curl -X GET \
  "$BASE_URL/learning/flashcards?contentId=$CONTENT_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n---"

echo "\n[Learning] Getting Specific Flashcard (ID: $FLASHCARD_ID)..."
curl -X GET \
  "$BASE_URL/learning/flashcards/$FLASHCARD_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n---"

echo "\n[Learning] Updating Flashcard (ID: $FLASHCARD_ID)..."
curl -X PUT \
  "$BASE_URL/learning/flashcards/$FLASHCARD_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["art", "technique", "italian"]
  }'

echo "\n---"

# echo "\n[Learning] Deleting Flashcard (ID: $FLASHCARD_ID)..." # Uncomment to test
# curl -X DELETE \
#  "$BASE_URL/learning/flashcards/$FLASHCARD_ID" \
#  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n============================================="

# ==================================
# == Learning (Quizzes) ==
# ==================================

echo "\n[Learning] Creating Quiz..."
curl -X POST \
  "$BASE_URL/learning/quizzes" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Art Terms Quiz",
    "description": "Quiz about common art terms.",
    "contentId": "'"$CONTENT_ID"'"
  }'
# **ACTION**: Copy 'id' from response: export QUIZ_ID="PASTE_ID_HERE"

echo "\n---"

echo "\n[Learning] Getting User Quizzes..."
curl -X GET \
  "$BASE_URL/learning/quizzes" \
  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n---"

echo "\n[Learning] Getting Specific Quiz (ID: $QUIZ_ID)..."
curl -X GET \
  "$BASE_URL/learning/quizzes/$QUIZ_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n---"

echo "\n[Learning] Updating Quiz (ID: $QUIZ_ID)..."
curl -X PUT \
  "$BASE_URL/learning/quizzes/$QUIZ_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Art Terms Quiz (Revised)"
  }'

echo "\n---"

echo "\n[Learning] Adding Question to Quiz (ID: $QUIZ_ID)..."
curl -X POST \
  "$BASE_URL/learning/quizzes/$QUIZ_ID/questions" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionText": "What is chiaroscuro?",
    "options": [
      "A type of paint",
      "A technique using light and shadow",
      "A famous sculpture",
      "A perspective method"
    ],
    "correctAnswerIndex": 1,
    "explanation": "It relates to light and shadow contrast."
  }'
# **ACTION**: Copy 'id' from response: export QUESTION_ID="PASTE_ID_HERE"

echo "\n---"

echo "\n[Learning] Getting Specific Question (ID: $QUESTION_ID)..."
curl -X GET \
  "$BASE_URL/learning/questions/$QUESTION_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n---"

echo "\n[Learning] Updating Question (ID: $QUESTION_ID)..."
curl -X PUT \
  "$BASE_URL/learning/questions/$QUESTION_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "explanation": "It is an Italian artistic term used to describe the dramatic effect of contrasting areas of light and dark in an artwork."
  }'

echo "\n---"

# echo "\n[Learning] Deleting Question (ID: $QUESTION_ID)..." # Uncomment to test
# curl -X DELETE \
#   "$BASE_URL/learning/questions/$QUESTION_ID" \
#   -H "Authorization: Bearer $AUTH_TOKEN"

# echo "\n---"

# echo "\n[Learning] Deleting Quiz (ID: $QUIZ_ID)..." # Uncomment to test
# curl -X DELETE \
#  "$BASE_URL/learning/quizzes/$QUIZ_ID" \
#  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n============================================="

# ==================================
# == SRS (Spaced Repetition) ==
# ==================================

echo "\n[SRS] Getting Due Review Cards..."
curl -X GET \
  "$BASE_URL/srs/reviews?limit=10" \
  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n---"

echo "\n[SRS] Recording Card Review (ID: $FLASHCARD_ID, Grade: 3)..."
curl -X POST \
  "$BASE_URL/srs/reviews" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "flashcardId": "'"$FLASHCARD_ID"'",
    "grade": 3
  }'

echo "\n============================================="

# ==================================
# == Search & Recommendations ==
# ==================================

echo "\n[Search] Searching Literature (Query: 'light shadow technique')..."
curl -X GET \
  "$BASE_URL/search/literature?q=light+shadow+technique" \
  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n---"

echo "\n[Search] Getting Recommendations (Not Implemented)..."
curl -X GET \
  "$BASE_URL/search/recommendations" \
  -H "Authorization: Bearer $AUTH_TOKEN"

echo "\n============================================="

# ==================================
# == Health Check ==
# ==================================

echo "\n[Health] Checking Root Endpoint..."
curl -X GET "$BASE_URL/"

echo "\n============================================="
echo "All commands executed."
