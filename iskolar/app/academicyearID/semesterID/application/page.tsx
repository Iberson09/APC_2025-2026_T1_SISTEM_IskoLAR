'use client';

import Image from "next/image";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// Common input style
const inputClassName = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 focus:ring-2 focus:ring-[#2196f3] focus:border-[#2196f3] focus:outline-none bg-white hover:border-gray-400";

// Barangay and ZIP code mapping
export default function ApplicationPage() {
  // Stepper state: 0 = Personal Info, 1 = Documents
  const [step, setStep] = useState(0);

  // Personal Info from users table
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [yearsOfResidency, setYearsOfResidency] = useState("");
  // Address states
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [barangay, setBarangay] = useState("");
  const [zipCode, setZipCode] = useState("");
  // College info from users table
  const [collegeName, setCollegeName] = useState("");
  const [course, setCourse] = useState("");

  // Fetch user data from database
  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
          return;
        }

        if (data) {
          setLastName(data.last_name);
          setFirstName(data.first_name);
          setMiddleName(data.middle_name || "");
          setEmail(data.email_address);
          setContactNumber(data.mobile_number);
          setGender(data.gender);
          setBirthdate(new Date(data.birthdate).toISOString().split('T')[0]);
          setAddressLine1(data.address_line1);
          setAddressLine2(data.address_line2 || "");
          setBarangay(data.barangay);
          setZipCode(data.zip_code);
          setCollegeName(data.college_university);
          setCourse(data.college_course);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    }

    fetchUserData();
  }, []);

  // File validation
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const validateFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      alert('File size must be less than 10MB');
      return false;
    }
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return false;
    }
    return true;
  };

  const [juniorHighName, setJuniorHighName] = useState("");
  const [juniorHighAddress, setJuniorHighAddress] = useState("");
  const [juniorHighYearStarted, setJuniorHighYearStarted] = useState("");
  const [juniorHighYearGraduated, setJuniorHighYearGraduated] = useState("");
  const [seniorHighName, setSeniorHighName] = useState("");
  const [seniorHighAddress, setSeniorHighAddress] = useState("");
  const [seniorHighYearStarted, setSeniorHighYearStarted] = useState("");
  const [seniorHighYearGraduated, setSeniorHighYearGraduated] = useState("");
  const [seniorHighStrand, setSeniorHighStrand] = useState("");
  
  const [collegeAddress, setCollegeAddress] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [collegeYearStarted, setCollegeYearStarted] = useState("");
  const [collegeExpectedGraduation, setCollegeExpectedGraduation] = useState("");
  const [motherMaidenName, setMotherMaidenName] = useState("");
  const [motherJob, setMotherJob] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [fatherJob, setFatherJob] = useState("");

  // Document Uploads
  const [, setRegFile] = useState<File | null>(null);
  const [regFileName, setRegFileName] = useState("");
  const [, setBirthCertFile] = useState<File | null>(null);
  const [birthCertFileName, setBirthCertFileName] = useState("");
  const [, setBrgyIdFile] = useState<File | null>(null);
  const [brgyIdFileName, setBrgyIdFileName] = useState("");
  const [, setVoterCertFile] = useState<File | null>(null);
  const [voterCertFileName, setVoterCertFileName] = useState("");
  const [, setGuardianVoterFile] = useState<File | null>(null);
  const [guardianVoterFileName, setGuardianVoterFileName] = useState("");
  const [, setIdFile] = useState<File | null>(null);
  const [idFileName, setIdFileName] = useState("");
  const [, setGradesFile] = useState<File | null>(null);
  const [gradesFileName, setGradesFileName] = useState("");

  const steps = [
    { label: "Personal" },
    { label: "Documents" },
  ];

  return (
    <div className="min-h-screen w-full bg-[#f5f6fa] pl-64 flex flex-col items-center">


      {/* Stepper */}
      <div className="w-full flex flex-col items-center pt-[80px] pb-6">
        <div className="flex justify-center w-full">
          <div className="flex items-center max-w-3xl px-8 mx-auto">
            {steps.map((stepObj, idx) => (
              <div key={stepObj.label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div 
                    className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-white
                      ${idx <= step ? "bg-[#2196f3] shadow-lg shadow-blue-200" : "bg-gray-300"} 
                      transition-all duration-300 transform ${idx === step ? "scale-110" : ""}`}
                  >
                    {idx + 1}
                  </div>
                  <span className="text-xs mt-1 text-gray-700">{stepObj.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`h-1 w-80 mx-2 ${idx < step ? "bg-[#2196f3]" : "bg-gray-300"}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="w-full max-w-3xl flex flex-col gap-6 px-8 pb-12">
        {step === 0 && (
          <div className="bg-white rounded-xl shadow p-6 mb-2">
            <div className="flex items-center gap-2 mb-4">
              <Image src="/icons/personal.svg" alt="Personal" width={19} height={19} />
              <span className="font-semibold text-gray-700 text-lg">Personal Information</span>
            </div>
            <hr className="border-gray-200 mb-4" />

            {/* Add spacing and grouping */}
            <div className="space-y-8">
              {/* Group related fields */}
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                {/* Name and Contact */}
                <div className="grid grid-cols-3 gap-4 mb-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Last Name <span className="text-red-500">*</span></label>
                    <input required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" value={lastName} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">First Name <span className="text-red-500">*</span></label>
                    <input required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" value={firstName} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Middle Name</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" value={middleName} readOnly />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email Address <span className="text-red-500">*</span></label>
                    <input required type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" value={email} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                    <input required type="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" value={contactNumber} readOnly />
                  </div>
                </div>

                {/* Gender & Birthdate */}
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Gender <span className="text-red-500">*</span></label>
                    <input required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" value={gender} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Birthdate <span className="text-red-500">*</span></label>
                    <input required type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" value={birthdate} readOnly />
                  </div>
                </div>

                {/* Address */}
                <div className="mt-6 mb-2 font-semibold text-gray-700">Address</div>
                <div className="grid grid-cols-1 gap-4 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Address Line 1 (House/Unit/Building + Street) <span className="text-red-500">*</span></label>
                    <input required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" value={addressLine1} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Address Line 2 (Subdivision/Village/Purok/Sitio)</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" value={addressLine2} readOnly />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Barangay <span className="text-red-500">*</span></label>
                    <input 
                      required 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" 
                      value={barangay}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">City/Municipality</label>
                    <input className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" value="Makati City" readOnly />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">ZIP Code <span className="text-red-500">*</span></label>
                    <input 
                      required 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" 
                      value={zipCode} 
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Years of Residency <span className="text-red-500">*</span></label>
                    <input 
                      required 
                      type="number"
                      min="0"
                      max="100"
                      className={inputClassName} 
                      value={yearsOfResidency} 
                      onChange={e => {
                        const value = e.target.value;
                        if (value === '' || (Number(value) >= 0 && Number(value) <= 100)) {
                          setYearsOfResidency(value);
                        }
                      }}
                      placeholder="Enter number of years"
                    />
                    {yearsOfResidency && (Number(yearsOfResidency) < 0 || Number(yearsOfResidency) > 100) && (
                      <p className="text-xs text-red-500 mt-1">Years must be between 0 and 100</p>
                    )}
                  </div>
                </div>

                {/* Education */}
                <div className="mt-6 mb-2 font-semibold text-gray-700">Educational Background</div>
                <div className="flex flex-col gap-4 mb-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Junior High School Name <span className="text-red-500">*</span></label>
                    <input required className={inputClassName} value={juniorHighName} onChange={e => setJuniorHighName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Junior High School Address <span className="text-red-500">*</span></label>
                    <input required className={inputClassName} value={juniorHighAddress} onChange={e => setJuniorHighAddress(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Year Started <span className="text-red-500">*</span></label>
                      <input 
                        required 
                        type="number"
                        min="2000"
                        max="2030"
                        className={inputClassName} 
                        value={juniorHighYearStarted} 
                        onChange={e => {
                          const value = e.target.value;
                          if (value === '' || (Number(value) >= 2000 && Number(value) <= 2030)) {
                            setJuniorHighYearStarted(value);
                          }
                        }}
                        placeholder="YYYY"
                      />
                      {juniorHighYearStarted && (Number(juniorHighYearStarted) < 2000 || Number(juniorHighYearStarted) > 2030) && (
                        <p className="text-xs text-red-500 mt-1">Year must be between 2000 and 2030</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Year Graduated <span className="text-red-500">*</span></label>
                      <input 
                        required 
                        type="number"
                        min="2000"
                        max="2030"
                        className={inputClassName} 
                        value={juniorHighYearGraduated} 
                        onChange={e => {
                          const value = e.target.value;
                          if (value === '' || (Number(value) >= 2000 && Number(value) <= 2030)) {
                            setJuniorHighYearGraduated(value);
                          }
                        }}
                        placeholder="YYYY"
                      />
                      {juniorHighYearGraduated && (Number(juniorHighYearGraduated) < 2000 || Number(juniorHighYearGraduated) > 2030) && (
                        <p className="text-xs text-red-500 mt-1">Year must be between 2000 and 2030</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Senior High School Name <span className="text-red-500">*</span></label>
                    <input required className={inputClassName} value={seniorHighName} onChange={e => setSeniorHighName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Senior High School Address <span className="text-red-500">*</span></label>
                    <input required className={inputClassName} value={seniorHighAddress} onChange={e => setSeniorHighAddress(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Year Started <span className="text-red-500">*</span></label>
                      <input 
                        required 
                        type="number"
                        min="2000"
                        max="2030"
                        className={inputClassName} 
                        value={seniorHighYearStarted} 
                        onChange={e => {
                          const value = e.target.value;
                          if (value === '' || (Number(value) >= 2000 && Number(value) <= 2030)) {
                            setSeniorHighYearStarted(value);
                          }
                        }}
                        placeholder="YYYY"
                      />
                      {seniorHighYearStarted && (Number(seniorHighYearStarted) < 2000 || Number(seniorHighYearStarted) > 2030) && (
                        <p className="text-xs text-red-500 mt-1">Year must be between 2000 and 2030</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Year Graduated <span className="text-red-500">*</span></label>
                      <input 
                        required 
                        type="number"
                        min="2000"
                        max="2030"
                        className={inputClassName} 
                        value={seniorHighYearGraduated} 
                        onChange={e => {
                          const value = e.target.value;
                          if (value === '' || (Number(value) >= 2000 && Number(value) <= 2030)) {
                            setSeniorHighYearGraduated(value);
                          }
                        }}
                        placeholder="YYYY"
                      />
                      {seniorHighYearGraduated && (Number(seniorHighYearGraduated) < 2000 || Number(seniorHighYearGraduated) > 2030) && (
                        <p className="text-xs text-red-500 mt-1">Year must be between 2000 and 2030</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Strand <span className="text-red-500">*</span></label>
                    <select required className={inputClassName} value={seniorHighStrand} onChange={e => setSeniorHighStrand(e.target.value)}>
                      <option value="">Select Strand</option>
                      <option value="STEM">STEM (Science, Technology, Engineering, and Mathematics)</option>
                      <option value="ABM">ABM (Accountancy, Business and Management)</option>
                      <option value="HUMSS">HUMSS (Humanities and Social Sciences)</option>
                      <option value="GAS">GAS (General Academic Strand)</option>
                      <option value="TVL">TVL (Technical-Vocational-Livelihood)</option>
                      <option value="Arts and Design">Arts and Design</option>
                      <option value="Sports">Sports</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">College or University Name <span className="text-red-500">*</span></label>
                    <input required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" value={collegeName} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">College or University Address <span className="text-red-500">*</span></label>
                    <input required className={inputClassName} value={collegeAddress} onChange={e => setCollegeAddress(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Year Started <span className="text-red-500">*</span></label>
                      <input 
                        required 
                        type="number"
                        className={inputClassName} 
                        value={collegeYearStarted} 
                        onChange={e => setCollegeYearStarted(e.target.value)}
                        placeholder="YYYY"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Expected Year of Graduation <span className="text-red-500">*</span></label>
                      <input 
                        required 
                        type="number"
                        className={inputClassName} 
                        value={collegeExpectedGraduation} 
                        onChange={e => setCollegeExpectedGraduation(e.target.value)}
                        placeholder="YYYY"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                      <label className="block text-xs text-gray-500 mb-1">Year Level <span className="text-red-500">*</span></label>
                      <select required className={inputClassName} value={yearLevel} onChange={e => setYearLevel(e.target.value)}>
                        <option value="">Select Year Level</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>
                    <div className="col-span-8">
                      <label className="block text-xs text-gray-500 mb-1">Course <span className="text-red-500">*</span></label>
                      <input required className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-gray-100" value={course} readOnly />
                    </div>
                  </div>
                </div>

                {/* Guardian Information */}
                <div className="mt-6 mb-2 font-semibold text-gray-700">Guardian Information</div>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Mother&apos;s Maiden Name <span className="text-red-500">*</span></label>
                    <input required className={inputClassName} value={motherMaidenName} onChange={e => setMotherMaidenName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Mother&apos;s Occupation</label>
                    <input className={inputClassName} value={motherJob} onChange={e => setMotherJob(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Father&apos;s Full Name <span className="text-red-500">*</span></label>
                    <input required className={inputClassName} value={fatherName} onChange={e => setFatherName(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Father&apos;s Occupation</label>
                    <input className={inputClassName} value={fatherJob} onChange={e => setFatherJob(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button className="cursor-pointer bg-[#2196f3] text-white px-8 py-2 rounded-lg font-medium shadow hover:bg-[#1976d2] transition" onClick={() => setStep(1)} type="button">Next</button>
            </div>
          </div>
        )}

        {/* Step 2: Documents (unchanged) */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow p-6 mb-2">
            <div className="flex items-center gap-2 mb-4">
              <Image src="/icons/documents.svg" alt="Documents" width={19} height={19} />
              <span className="font-semibold text-gray-700 text-lg">Required Documents</span>
            </div>
            <hr className="border-gray-200 mb-4" />
            <div className="mb-6 bg-gradient-to-r from-[#e3f2fd] to-[#f8fafc] rounded-xl px-5 py-4 border border-[#B6D6F6] shadow-sm flex flex-col justify-center">
              <div className="text-[15px] text-[#1976d2] font-semibold">
                Upload the following documents to complete your application.
              </div>
              <div className="text-xs text-gray-500">
                Please upload clear and valid copies of your documents below.
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5">
              {/* PSA Birth Certificate */}
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-medium">PSA Birth Certificate</label>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-[#F8F9FB] border-2 border-dashed border-[#90caf9]">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="cursor-pointer block w-full text-sm text-gray-700 bg-transparent file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-[#e3f2fd] file:text-[#1976d2] file:font-medium"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          if (validateFile(e.target.files[0])) {
                            setBirthCertFile(e.target.files[0]);
                            setBirthCertFileName(e.target.files[0].name);
                          } else {
                            e.target.value = '';
                            setBirthCertFileName('');
                          }
                        }
                      }}
                    />
                    <span className="text-xs text-gray-500 truncate">{birthCertFileName}</span>
                  </div>
                  <span className="text-xs text-gray-500 ml-1">Max file size: 10MB, PDF files only</span>
                </div>
              </div>
              {/* Student's Voter's Certification */}
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-medium">Student&apos;s Voter&apos;s Certification</label>
                <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-[#F8F9FB] border-2 border-dashed border-[#90caf9]">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="cursor-pointer block w-full text-sm text-gray-700 bg-transparent file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-[#e3f2fd] file:text-[#1976d2] file:font-medium"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setVoterCertFile(e.target.files[0]);
                        setVoterCertFileName(e.target.files[0].name);
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500 truncate">{voterCertFileName}</span>
                </div>
              </div>
              {/* Guardian's Voter's Certification */}
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-medium">Guardian&apos;s Voter&apos;s Certification</label>
                <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-[#F8F9FB] border-2 border-dashed border-[#90caf9]">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="cursor-pointer block w-full text-sm text-gray-700 bg-transparent file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-[#e3f2fd] file:text-[#1976d2] file:font-medium"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setGuardianVoterFile(e.target.files[0]);
                        setGuardianVoterFileName(e.target.files[0].name);
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500 truncate">{guardianVoterFileName}</span>
                </div>
              </div>
              {/* Barangay ID */}
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-medium">Barangay ID</label>
                <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-[#F8F9FB] border-2 border-dashed border-[#90caf9]">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="cursor-pointer block w-full text-sm text-gray-700 bg-transparent file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-[#e3f2fd] file:text-[#1976d2] file:font-medium"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setBrgyIdFile(e.target.files[0]);
                        setBrgyIdFileName(e.target.files[0].name);
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500 truncate">{brgyIdFileName}</span>
                </div>
              </div>
              {/* Valid ID or School ID */}
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-medium">Valid ID or School ID</label>
                <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-[#F8F9FB] border-2 border-dashed border-[#90caf9]">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="cursor-pointer block w-full text-sm text-gray-700 bg-transparent file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-[#e3f2fd] file:text-[#1976d2] file:font-medium"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setIdFile(e.target.files[0]);
                        setIdFileName(e.target.files[0].name);
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500 truncate">{idFileName}</span>
                </div>
              </div>
              {/* Certificate of Registration */}
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-medium">Certificate of Registration</label>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-[#F8F9FB] border-2 border-dashed border-[#90caf9]">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="cursor-pointer block w-full text-sm text-gray-700 bg-transparent file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-[#e3f2fd] file:text-[#1976d2] file:font-medium"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          if (validateFile(e.target.files[0])) {
                            setRegFile(e.target.files[0]);
                            setRegFileName(e.target.files[0].name);
                          } else {
                            e.target.value = '';
                            setRegFileName('');
                          }
                        }
                      }}
                    />
                    <span className="text-xs text-gray-500 truncate">{regFileName}</span>
                  </div>
                  <span className="text-xs text-gray-500 ml-1">Max file size: 10MB, PDF files only</span>
                </div>
              </div>
              {/* Certificate of Grades */}
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-medium">Certificate of Grades</label>
                <div className="flex items-center gap-3 rounded-lg px-4 py-3 bg-[#F8F9FB] border-2 border-dashed border-[#90caf9]">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="cursor-pointer block w-full text-sm text-gray-700 bg-transparent file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-[#e3f2fd] file:text-[#1976d2] file:font-medium"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setGradesFile(e.target.files[0]);
                        setGradesFileName(e.target.files[0].name);
                      }
                    }}
                  />
                  <span className="text-xs text-gray-500 truncate">{gradesFileName}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button
                className="cursor-pointer bg-gray-200 text-gray-700 px-8 py-2 rounded-lg font-medium shadow hover:bg-gray-300 transition"
                onClick={() => setStep(0)}
                type="button"
              >
                Back
              </button>
              <button
                className="cursor-pointer bg-[#2196f3] text-white px-8 py-2 rounded-lg font-medium shadow hover:bg-[#1976d2] transition"
                onClick={() => alert("Submitted!")}
                type="button"
              >
                Submit Application
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}