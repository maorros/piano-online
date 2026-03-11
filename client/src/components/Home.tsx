import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function generateRoomId(): string {
  // 6-character alphanumeric code
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const Home: React.FC = () => {
  const navigate = useNavigate()
  const [teacherName, setTeacherName] = useState('')
  const [inviteeName, setInviteeName] = useState('')
  const [studentName, setStudentName] = useState('')
  const [studentCode, setStudentCode] = useState('')
  const [studentError, setStudentError] = useState('')
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreateRoom = () => {
    const roomId = generateRoomId()
    setCreatedRoomId(roomId)
  }

  const handleStartLesson = () => {
    if (createdRoomId) {
      const name = teacherName.trim() || 'Teacher'
      navigate(`/room/${createdRoomId}?role=teacher&name=${encodeURIComponent(name)}`)
    }
  }

  const handleCopyLink = async () => {
    if (!createdRoomId) return
    const name = inviteeName.trim() || 'Student'
    const link = `${window.location.origin}/room/${createdRoomId}?role=student&name=${encodeURIComponent(name)}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoinRoom = () => {
    const code = studentCode.trim().toUpperCase()
    if (!code) {
      setStudentError('Please enter a room code.')
      return
    }
    if (code.length !== 6) {
      setStudentError('Room code must be 6 characters.')
      return
    }
    const name = studentName.trim() || 'Student'
    navigate(`/room/${code}?role=student&name=${encodeURIComponent(name)}`)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <img src="/ptp_eng.png" alt="PTP Playing Through Playing" className="h-20 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">Piano Online</h1>
          <p className="text-gray-400 text-lg">Real-time collaborative piano lessons</p>
          <div className="flex items-center justify-center gap-1.5 mt-3 text-gray-400 text-sm">
            <span>by Maor</span>
            <img src="/white_logo_transparent.png" alt="MR" className="h-5 w-auto" />
            <span>Rosenberg</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Teacher card */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">T</div>
              <div>
                <h2 className="text-white font-semibold text-lg">I'm a Teacher</h2>
                <p className="text-gray-400 text-sm">Create a lesson room</p>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Your name (e.g. Maor)"
                maxLength={30}
                className="w-full px-4 py-3 bg-gray-900 text-white placeholder-gray-500 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
              <input
                type="text"
                value={inviteeName}
                onChange={(e) => setInviteeName(e.target.value)}
                placeholder="Student's name (e.g. Liam)"
                maxLength={30}
                className="w-full px-4 py-3 bg-gray-900 text-white placeholder-gray-500 rounded-xl border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
              {!createdRoomId ? (
                <button
                  onClick={handleCreateRoom}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
                >
                  Create a Lesson
                </button>
              ) : (
                <>
                  <div className="bg-gray-900 rounded-xl p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">Room Code</p>
                    <p className="text-3xl font-mono font-bold text-white tracking-widest">{createdRoomId}</p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-xl transition-colors"
                  >
                    {copied ? '✓ Link Copied!' : 'Copy Student Link'}
                  </button>
                  <button
                    onClick={handleStartLesson}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
                  >
                    Start Lesson →
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Student card */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">S</div>
              <div>
                <h2 className="text-white font-semibold text-lg">I'm a Student</h2>
                <p className="text-gray-400 text-sm">Join a teacher's room</p>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Your name"
                maxLength={30}
                className="w-full px-4 py-3 bg-gray-900 text-white placeholder-gray-500 rounded-xl border border-gray-700 focus:border-red-500 focus:outline-none"
              />
              <input
                type="text"
                value={studentCode}
                onChange={(e) => {
                  setStudentCode(e.target.value.toUpperCase())
                  setStudentError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="Enter room code (e.g. A3B9C1)"
                maxLength={6}
                className="w-full px-4 py-3 bg-gray-900 text-white placeholder-gray-500 rounded-xl border border-gray-700 focus:border-red-500 focus:outline-none font-mono text-lg tracking-widest text-center uppercase"
              />
              {studentError && (
                <p className="text-red-400 text-sm text-center">{studentError}</p>
              )}
              <button
                onClick={handleJoinRoom}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors"
              >
                Join Lesson
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-gray-500 text-sm space-y-1">
          <p>Supports MIDI keyboards on desktop (Chrome/Edge) and Android</p>
          <p>iOS users can use the on-screen keyboard</p>
        </div>
      </div>
    </div>
  )
}
