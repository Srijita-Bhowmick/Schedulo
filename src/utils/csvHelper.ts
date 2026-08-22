import { Teacher, Subject, Room, BatchSection } from '../types';

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function generateSampleCsv(type: 'teachers' | 'subjects' | 'rooms' | 'batches'): string {
  if (type === 'teachers') {
    return [
      'name,shortCode,department,email,maxHoursPerDay,maxHoursPerWeek,unavailableSlots',
      'Dr. Debabrata Roy,DR,Computer Science & Engg.,d.roy@makaut.ac.in,4,16,Monday:0|Friday:6',
      'Prof. Ananya Sen,AS,Computer Science & Engg.,ananya.sen@makaut.ac.in,4,18,Wednesday:5|Wednesday:6',
      'Dr. Subhashish Mukherjee,SM,Information Technology,s.mukherjee@makaut.ac.in,5,18,Tuesday:0',
    ].join('\n');
  }

  if (type === 'subjects') {
    return [
      'code,name,type,weeklyHours,durationSlots,assignedTeacherShortCode,preferredRoomType',
      'PCC-CS301,Data Structures & Algorithms,THEORY,4,1,DR,LECTURE_HALL',
      'PCC-CS391,DSA Laboratory,LAB,3,3,DR,COMPUTER_LAB',
      'ESC-301,Digital Logic Design,THEORY,3,1,TK,LECTURE_HALL',
    ].join('\n');
  }

  if (type === 'rooms') {
    return [
      'roomNumber,name,type,capacity,building',
      'LH-101,Main Lecture Hall A,LECTURE_HALL,75,Ramanujan Bhavan',
      'CLAB-1,Systems & Networks Lab,COMPUTER_LAB,70,Turing Block',
      'SLAB-1,Hardware & IoT Lab,SCIENCE_LAB,60,Bose Bhavan',
      'SEM-301,Department Seminar Hall,SEMINAR_HALL,120,Central Complex',
    ].join('\n');
  }

  return [
    'name,department,semester,studentCount,subjectCodes',
    'CSE - 3rd Sem (Sec A),Computer Science & Engg.,3,60,PCC-CS301|PCC-CS391|ESC-301',
    'CSE - 5th Sem (Sec A),Computer Science & Engg.,5,65,PCC-CS501|PCC-CS591',
  ].join('\n');
}

export function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/);
  return lines.map((line) => {
    // Simple CSV parser handling quotes
    const row: string[] = [];
    let inQuotes = false;
    let currentToken = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(currentToken.trim());
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    row.push(currentToken.trim());
    return row;
  });
}
